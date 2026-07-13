import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Language, OtpType, Prisma, User } from '@prisma/client';

import { AppSettings } from '../../config/app.config';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmailService } from '../email/email.service';

import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AuthenticatedUserView, AuthResponse, AuthTokens, RegisterResult } from './types/auth-response.type';
import { AccessTokenPayload, RefreshTokenPayload } from './types/token-payload.type';
import { generateOtpCode, getOtpExpiry, hashOtpCode, verifyOtpCode } from './utils/otp.util';
import { randomBytes } from 'crypto';

import { hashPassword, verifyPassword } from './utils/password.util';
import { calculateExpiry, generateTokenId, hashToken } from './utils/token.util';

export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

const GENERIC_LOGIN_ERROR = "Login yoki parol noto'g'ri";
const GENERIC_OTP_ERROR = "Tasdiqlash kodi noto'g'ri yoki muddati o'tgan";
const FREE_PLAN_PERIOD_DAYS = 30;

const USER_WITH_ROLES_INCLUDE = {
  profile: true,
  roles: { include: { role: true } },
} satisfies Prisma.UserInclude;

type UserWithRoles = Prisma.UserGetPayload<{ include: typeof USER_WITH_ROLES_INCLUDE }>;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly appSettings: AppSettings;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditLogsService: AuditLogsService,
    private readonly emailService: EmailService,
    configService: ConfigService<{ app: AppSettings }, true>,
  ) {
    this.appSettings = configService.get('app', { infer: true });
  }

  // ============================================================
  // REGISTER
  // ============================================================

  async register(dto: RegisterDto, context: RequestContext): Promise<RegisterResult> {
    const target = dto.phone ?? dto.email;
    if (!target) {
      throw new BadRequestException('Telefon raqami yoki email manzilidan kamida bittasi kiritilishi shart');
    }

    const uniquenessConditions: Prisma.UserWhereInput[] = [];
    if (dto.phone) uniquenessConditions.push({ phone: dto.phone });
    if (dto.email) uniquenessConditions.push({ email: dto.email });

    const existing = await this.prisma.user.findFirst({
      where: { OR: uniquenessConditions },
    });
    if (existing) {
      throw new ConflictException("Bu telefon raqami yoki email allaqachon ro'yxatdan o'tgan");
    }

    const passwordHash = await hashPassword(dto.password, this.appSettings.argon2);

    const { user, otpCode } = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          phone: dto.phone ?? null,
          email: dto.email ?? null,
          passwordHash,
          language: dto.language,
          status: 'PENDING',
        },
      });

      await tx.userProfile.create({
        data: { userId: createdUser.id, firstName: dto.firstName, lastName: dto.lastName },
      });

      const userRole = await tx.role.findUnique({ where: { name: 'USER' } });
      if (userRole) {
        await tx.userRole.create({ data: { userId: createdUser.id, roleId: userRole.id } });
      }

      const periodStart = new Date();
      const periodEnd = new Date(periodStart.getTime() + FREE_PLAN_PERIOD_DAYS * 86_400_000);
      await tx.usageCounter.create({ data: { userId: createdUser.id, periodStart, periodEnd } });

      const freePlan = await tx.subscriptionPlan.findUnique({ where: { code: 'FREE' } });
      if (freePlan) {
        await tx.subscription.create({
          data: {
            userId: createdUser.id,
            planId: freePlan.id,
            status: 'ACTIVE',
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          },
        });
      }

      const code = await this.issueOtp(tx, createdUser.id, 'REGISTER');

      return { user: createdUser, otpCode: code };
    });

    this.logOtpInDevelopment(target, 'REGISTER', otpCode);

    if (dto.email) {
      this.emailService.sendOtpEmail(dto.email, otpCode).catch((err) => {
        this.logger.error(`Register OTP email yuborishda xatolik: ${err.message}`);
      });
    }

    await this.auditLogsService.createLog({
      userId: user.id,
      action: 'CREATE',
      entityType: 'User',
      entityId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { event: 'REGISTER', target },
    });

    return { userId: user.id, requiresVerification: true, target };
  }

  // ============================================================
  // VERIFY OTP
  // ============================================================

  async verifyOtp(dto: VerifyOtpDto, context: RequestContext): Promise<AuthResponse> {
    const user = await this.findUserByIdentifier(dto.target);
    if (!user) {
      throw new BadRequestException(GENERIC_OTP_ERROR);
    }

    await this.consumeOtp(user.id, dto.type, dto.code);

    if (dto.type === 'REGISTER' && user.status === 'PENDING') {
      await this.prisma.user.update({ where: { id: user.id }, data: { status: 'ACTIVE' } });
      user.status = 'ACTIVE';
    }

    const session = await this.createSession(user.id, context, null);
    const roles = user.roles.map((userRole) => userRole.role.name);
    const tokens = await this.issueTokens(user.id, session.id, roles);

    await this.auditLogsService.createLog({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'Session',
      entityId: session.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { event: 'VERIFY_OTP', otpType: dto.type },
    });

    return { ...tokens, user: this.toUserView(user) };
  }

  // ============================================================
  // RESEND OTP
  // ============================================================

  async resendOtp(dto: ResendOtpDto): Promise<{ message: string }> {
    const message = "Agar hisob mavjud bo'lsa, tasdiqlash kodi qayta yuborildi";
    const user = await this.findUserByIdentifier(dto.target);
    if (!user) {
      return { message };
    }

    const cooldownMs = this.appSettings.otp.resendCooldownSeconds * 1_000;
    const lastOtp = await this.prisma.otpCode.findFirst({
      where: { userId: user.id, type: dto.type },
      orderBy: { createdAt: 'desc' },
    });
    if (lastOtp && Date.now() - lastOtp.createdAt.getTime() < cooldownMs) {
      throw new BadRequestException('Iltimos, qayta urinishdan oldin biroz kuting');
    }

    const code = await this.prisma.$transaction((tx) => this.issueOtp(tx, user.id, dto.type));
    this.logOtpInDevelopment(dto.target, dto.type, code);

    if (user.email && dto.target === user.email) {
      const sendEmail =
        dto.type === 'PASSWORD_RESET'
          ? this.emailService.sendPasswordResetEmail(user.email, code)
          : this.emailService.sendOtpEmail(user.email, code);
      sendEmail.catch((err) => {
        this.logger.error(`Resend OTP email yuborishda xatolik: ${err.message}`);
      });
    }

    return { message };
  }

  // ============================================================
  // LOGIN
  // ============================================================

  async login(dto: LoginDto, context: RequestContext): Promise<AuthResponse> {
    const user = await this.findUserByIdentifier(dto.identifier);
    if (!user) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    if (user.status === 'BLOCKED') {
      throw new ForbiddenException("Hisobingiz bloklangan. Qo'llab-quvvatlash xizmatiga murojaat qiling.");
    }
    if (user.status === 'PENDING') {
      throw new ForbiddenException('Hisobingiz hali tasdiqlanmagan. Avval tasdiqlash kodini kiriting.');
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    const passwordOk = await verifyPassword(user.passwordHash, dto.password);
    if (!passwordOk) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    const session = await this.createSession(user.id, context, dto.deviceId ?? null);
    const roles = user.roles.map((userRole) => userRole.role.name);
    const tokens = await this.issueTokens(user.id, session.id, roles);

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    await this.auditLogsService.createLog({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'Session',
      entityId: session.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { event: 'LOGIN', deviceName: dto.deviceName ?? null },
    });

    return { ...tokens, user: this.toUserView(user) };
  }

  // ============================================================
  // SOCIAL LOGIN (Google / OneID)
  // ============================================================

  /**
   * Ijtimoiy provayder (Google, OneID) orqali kirish. Provayder emailni
   * tasdiqlagani uchun OTP talab qilinmaydi — foydalanuvchi topilmasa ACTIVE
   * holatda yaratiladi (USER roli + bepul tarif) va tokenlar beriladi.
   */
  async socialLogin(
    profile: { email: string; firstName?: string | null; lastName?: string | null; provider: string },
    context: RequestContext,
  ): Promise<AuthResponse> {
    const email = profile.email.toLowerCase();

    let user = await this.prisma.user.findFirst({
      where: { email },
      include: USER_WITH_ROLES_INCLUDE,
    });

    if (!user) {
      const passwordHash = await hashPassword(randomBytes(24).toString('hex'), this.appSettings.argon2);
      const created = await this.prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: { email, passwordHash, language: Language.UZ, status: 'ACTIVE' },
        });
        await tx.userProfile.create({
          data: { userId: u.id, firstName: profile.firstName ?? null, lastName: profile.lastName ?? null },
        });
        const role = await tx.role.findUnique({ where: { name: 'USER' } });
        if (role) await tx.userRole.create({ data: { userId: u.id, roleId: role.id } });

        const periodStart = new Date();
        const periodEnd = new Date(periodStart.getTime() + FREE_PLAN_PERIOD_DAYS * 86_400_000);
        await tx.usageCounter.create({ data: { userId: u.id, periodStart, periodEnd } });

        const freePlan = await tx.subscriptionPlan.findUnique({ where: { code: 'FREE' } });
        if (freePlan) {
          await tx.subscription.create({
            data: {
              userId: u.id,
              planId: freePlan.id,
              status: 'ACTIVE',
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
            },
          });
        }
        return u;
      });

      user = await this.prisma.user.findUnique({
        where: { id: created.id },
        include: USER_WITH_ROLES_INCLUDE,
      });
    }

    if (!user) throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    if (user.status === 'BLOCKED') {
      throw new ForbiddenException("Hisobingiz bloklangan. Qo'llab-quvvatlash xizmatiga murojaat qiling.");
    }

    const session = await this.createSession(user.id, context, null);
    const roles = user.roles.map((userRole) => userRole.role.name);
    const tokens = await this.issueTokens(user.id, session.id, roles);

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.auditLogsService.createLog({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'Session',
      entityId: session.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { event: 'SOCIAL_LOGIN', provider: profile.provider },
    });

    return { ...tokens, user: this.toUserView(user) };
  }

  // ============================================================
  // REFRESH TOKEN (rotation)
  // ============================================================

  async refresh(
    dto: RefreshTokenDto,
    payload: { userId: string; sessionId: string; tokenId: string },
    context: RequestContext,
  ): Promise<AuthTokens> {
    const storedToken = await this.prisma.refreshToken.findUnique({ where: { id: payload.tokenId } });

    if (
      !storedToken ||
      storedToken.userId !== payload.userId ||
      storedToken.sessionId !== payload.sessionId ||
      storedToken.revokedAt ||
      storedToken.expiresAt.getTime() < Date.now() ||
      storedToken.tokenHash !== hashToken(dto.refreshToken)
    ) {
      throw new UnauthorizedException('Refresh token yaroqsiz yoki muddati tugagan');
    }

    const [user, session] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: payload.userId }, include: USER_WITH_ROLES_INCLUDE }),
      this.prisma.session.findUnique({ where: { id: payload.sessionId } }),
    ]);

    if (!user || user.status !== 'ACTIVE' || !session || session.status !== 'ACTIVE') {
      throw new UnauthorizedException('Sessiya yaroqsiz yoki tugatilgan');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const roles = user.roles.map((userRole) => userRole.role.name);
    const tokens = await this.issueTokens(user.id, session.id, roles);

    await this.prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });

    await this.auditLogsService.createLog({
      userId: user.id,
      action: 'UPDATE',
      entityType: 'RefreshToken',
      entityId: storedToken.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { event: 'REFRESH_TOKEN', sessionId: session.id },
    });

    return tokens;
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  async logout(dto: LogoutDto, context: RequestContext): Promise<{ message: string }> {
    const tokenHash = hashToken(dto.refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (storedToken && !storedToken.revokedAt) {
      await this.prisma.$transaction([
        this.prisma.refreshToken.update({ where: { id: storedToken.id }, data: { revokedAt: new Date() } }),
        ...(storedToken.sessionId
          ? [
              this.prisma.session.update({
                where: { id: storedToken.sessionId },
                data: { status: 'REVOKED', revokedAt: new Date() },
              }),
            ]
          : []),
      ]);

      await this.auditLogsService.createLog({
        userId: storedToken.userId,
        action: 'LOGOUT',
        entityType: 'Session',
        entityId: storedToken.sessionId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { event: 'LOGOUT' },
      });
    }

    return { message: 'Tizimdan chiqildi' };
  }

  // ============================================================
  // FORGOT PASSWORD
  // ============================================================

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const message = "Agar akkaunt mavjud bo'lsa, tiklash kodi yuborildi";
    const user = await this.findUserByIdentifier(dto.target);
    if (!user) {
      return { message };
    }

    const code = await this.prisma.$transaction((tx) => this.issueOtp(tx, user.id, 'PASSWORD_RESET'));
    this.logOtpInDevelopment(dto.target, 'PASSWORD_RESET', code);

    if (user.email && dto.target === user.email) {
      this.emailService.sendPasswordResetEmail(user.email, code).catch((err) => {
        this.logger.error(`Password reset email yuborishda xatolik: ${err.message}`);
      });
    }

    return { message };
  }

  // ============================================================
  // RESET PASSWORD
  // ============================================================

  async resetPassword(dto: ResetPasswordDto, context: RequestContext): Promise<{ message: string }> {
    const user = await this.findUserByIdentifier(dto.target);
    if (!user) {
      throw new BadRequestException(GENERIC_OTP_ERROR);
    }

    await this.consumeOtp(user.id, 'PASSWORD_RESET', dto.code);

    const passwordHash = await hashPassword(dto.newPassword, this.appSettings.argon2);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.session.updateMany({
        where: { userId: user.id, status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt: now },
      }),
    ]);

    await this.auditLogsService.createLog({
      userId: user.id,
      action: 'UPDATE',
      entityType: 'User',
      entityId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { event: 'PASSWORD_RESET' },
    });

    return { message: 'Parol muvaffaqiyatli yangilandi' };
  }

  // ============================================================
  // ME
  // ============================================================

  async me(userId: string): Promise<AuthenticatedUserView & { subscription: unknown; usage: unknown }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        ...USER_WITH_ROLES_INCLUDE,
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        usageCounters: {
          orderBy: { periodStart: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    const [subscription] = user.subscriptions;
    const [usage] = user.usageCounters;

    return {
      ...this.toUserView(user),
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            plan: {
              code: subscription.plan.code,
              name: subscription.plan.name,
              questionLimit: subscription.plan.questionLimit,
              documentAnalysisLimit: subscription.plan.documentAnalysisLimit,
              generatedDocumentLimit: subscription.plan.generatedDocumentLimit,
              voiceMinutesLimit: subscription.plan.voiceMinutesLimit,
              maxFileSizeMb: subscription.plan.maxFileSizeMb,
            },
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
          }
        : null,
      usage: usage
        ? {
            periodStart: usage.periodStart,
            periodEnd: usage.periodEnd,
            questionsUsed: usage.questionsUsed,
            analysesUsed: usage.analysesUsed,
            documentsUsed: usage.documentsUsed,
            voiceSecondsUsed: usage.voiceSecondsUsed,
          }
        : null,
    };
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private async findUserByIdentifier(identifier: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findFirst({
      where: { OR: [{ phone: identifier }, { email: identifier }] },
      include: USER_WITH_ROLES_INCLUDE,
    });
  }

  private async issueOtp(tx: Prisma.TransactionClient, userId: string, type: OtpType): Promise<string> {
    const code = generateOtpCode();
    const { otp } = this.appSettings;

    await tx.otpCode.updateMany({
      where: { userId, type, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    await tx.otpCode.create({
      data: {
        userId,
        type,
        codeHash: hashOtpCode(code),
        maxAttempts: otp.maxAttempts,
        expiresAt: getOtpExpiry(otp.expiresInMinutes),
      },
    });

    return code;
  }

  private async consumeOtp(userId: string, type: OtpType, code: string): Promise<void> {
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: { userId, type, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException(GENERIC_OTP_ERROR);
    }
    if (otpRecord.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("Tasdiqlash kodining muddati o'tgan. Yangi kod so'rang.");
    }
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      throw new BadRequestException("Urinishlar soni tugadi. Yangi kod so'rang.");
    }

    if (!verifyOtpCode(code, otpRecord.codeHash)) {
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException("Tasdiqlash kodi noto'g'ri");
    }

    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { consumedAt: new Date() },
    });
  }

  private async createSession(userId: string, context: RequestContext, deviceId: string | null) {
    const expiresAt = calculateExpiry(this.appSettings.jwt.refreshExpiresIn);
    return this.prisma.session.create({
      data: {
        userId,
        status: 'ACTIVE',
        deviceId,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        expiresAt,
      },
    });
  }

  private async issueTokens(userId: string, sessionId: string, roles: string[]): Promise<AuthTokens> {
    const { jwt } = this.appSettings;

    const accessPayload: AccessTokenPayload = { sub: userId, sessionId, roles, type: 'access' };
    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: jwt.accessSecret,
      expiresIn: jwt.accessExpiresIn,
    });

    const tokenId = generateTokenId();
    const refreshPayload: RefreshTokenPayload = { sub: userId, sessionId, type: 'refresh', tokenId };
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: jwt.refreshSecret,
      expiresIn: jwt.refreshExpiresIn,
    });

    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId,
        sessionId,
        tokenHash: hashToken(refreshToken),
        expiresAt: calculateExpiry(jwt.refreshExpiresIn),
      },
    });

    return { accessToken, refreshToken };
  }

  private toUserView(
    user: UserWithRoles | (User & { profile: UserWithRoles['profile']; roles: UserWithRoles['roles'] }),
  ): AuthenticatedUserView {
    return {
      id: user.id,
      firstName: user.profile?.firstName ?? null,
      lastName: user.profile?.lastName ?? null,
      phone: user.phone,
      email: user.email,
      language: user.language,
      roles: user.roles.map((userRole) => userRole.role.name),
    };
  }

  private logOtpInDevelopment(target: string, type: OtpType, code: string): void {
    if (this.appSettings.nodeEnv !== 'production') {
      this.logger.debug(`[DEV] OTP (${type}) — "${target}" uchun kod: ${code}`);
    }
  }
}
