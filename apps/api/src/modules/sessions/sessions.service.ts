import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Session } from '@prisma/client';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../../database/prisma/prisma.service';

export interface SessionView {
  id: string;
  deviceName: string | null;
  deviceType: string | null;
  os: string | null;
  browser: string | null;
  ipAddress: string | null;
  lastUsedAt: Date;
  createdAt: Date;
  currentSession: boolean;
}

interface ParsedUserAgent {
  deviceType: string | null;
  os: string | null;
  browser: string | null;
}

const OS_PATTERNS: Array<[RegExp, string]> = [
  [/windows/i, 'Windows'],
  [/android/i, 'Android'],
  [/iphone|ipad|ios/i, 'iOS'],
  [/mac os/i, 'macOS'],
  [/linux/i, 'Linux'],
];

const BROWSER_PATTERNS: Array<[RegExp, string]> = [
  [/edg/i, 'Edge'],
  [/chrome/i, 'Chrome'],
  [/firefox/i, 'Firefox'],
  [/safari/i, 'Safari'],
];

/** `User-Agent` headeridan qurilma turi, OS va brauzerni taxminiy aniqlaydi (qo'shimcha kutubxonasiz). */
const parseUserAgent = (userAgent: string | null): ParsedUserAgent => {
  if (!userAgent) {
    return { deviceType: null, os: null, browser: null };
  }

  const deviceType = /mobile|android|iphone/i.test(userAgent)
    ? 'mobile'
    : /tablet|ipad/i.test(userAgent)
      ? 'tablet'
      : 'desktop';

  const os = OS_PATTERNS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;
  const browser = BROWSER_PATTERNS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;

  return { deviceType, os, browser };
};

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async listSessions(userId: string, currentSessionId: string): Promise<SessionView[]> {
    const sessions = await this.prisma.session.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { lastSeenAt: 'desc' },
    });

    return sessions.map((session) => this.toView(session, currentSessionId));
  }

  async revokeSession(
    userId: string,
    sessionId: string,
    context: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<{ message: string }> {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Sessiya topilmadi');
    }
    if (session.userId !== userId) {
      throw new ForbiddenException("Faqat o'z sessiyangizni bekor qila olasiz");
    }

    await this.revokeSessions([session.id]);

    await this.auditLogsService.createLog({
      userId,
      action: 'UPDATE',
      entityType: 'Session',
      entityId: session.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { event: 'SESSION_REVOKE', scope: 'single' },
    });

    return { message: 'Sessiya bekor qilindi' };
  }

  async revokeAllSessions(
    userId: string,
    currentSessionId: string,
    includeCurrent: boolean,
    context: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<{ message: string }> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        ...(includeCurrent ? {} : { id: { not: currentSessionId } }),
      },
      select: { id: true },
    });

    if (sessions.length > 0) {
      await this.revokeSessions(sessions.map((session) => session.id));
    }

    await this.auditLogsService.createLog({
      userId,
      action: 'UPDATE',
      entityType: 'Session',
      entityId: null,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { event: 'SESSION_REVOKE', scope: includeCurrent ? 'all' : 'others', count: sessions.length },
    });

    return { message: `${sessions.length} ta sessiya bekor qilindi` };
  }

  private async revokeSessions(sessionIds: string[]): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.session.updateMany({
        where: { id: { in: sessionIds } },
        data: { status: 'REVOKED', revokedAt: now },
      }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId: { in: sessionIds }, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
  }

  private toView(session: Session, currentSessionId: string): SessionView {
    const { deviceType, os, browser } = parseUserAgent(session.userAgent);

    return {
      id: session.id,
      deviceName: session.deviceId,
      deviceType,
      os,
      browser,
      ipAddress: session.ipAddress,
      lastUsedAt: session.lastSeenAt,
      createdAt: session.createdAt,
      currentSession: session.id === currentSessionId,
    };
  }
}
