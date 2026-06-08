import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';

export interface CreateAuditLogInput {
  userId?: string | null;
  adminId?: string | null;
  action: AuditAction;
  entityType?: string | null;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}

/**
 * Audit yozuvlarini yaratadi. Hech qachon asosiy oqimni to'xtatmasligi kerak —
 * shu sababli yozish xatosi faqat log qilinadi, exception otilmaydi.
 */
@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createLog(input: CreateAuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: input.userId ?? null,
          adminId: input.adminId ?? null,
          action: input.action,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          metadata: input.metadata ?? Prisma.JsonNull,
        },
      });
    } catch (error) {
      this.logger.warn(`Audit log yozib bo'lmadi: ${(error as Error).message}`);
    }
  }
}
