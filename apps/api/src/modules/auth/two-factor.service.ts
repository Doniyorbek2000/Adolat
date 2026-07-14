import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { verifyPassword } from './utils/password.util';
import {
  buildOtpAuthUrl,
  generateTotpSecret,
  verifyTotp,
} from './utils/totp.util';

export interface TwoFactorSetupResult {
  secret: string;
  otpauthUrl: string;
}

/**
 * Ikki bosqichli autentifikatsiya (TOTP) boshqaruvi. Foydalanuvchi sirni
 * o'rnatadi (setup), authenticator ilovasidan kelgan kod bilan tasdiqlaydi
 * (enable), va o'chirishi mumkin (disable). Login jarayonida kod tekshiriladi.
 */
@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  /**
   * 1-qadam: yangi TOTP siri yaratadi va saqlaydi (hali yoqilmaydi). Mijoz
   * `otpauthUrl` dan QR chizadi yoki `secret` ni qo'lda kiritadi.
   */
  async setup(userId: string): Promise<TwoFactorSetupResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (user.isTwoFaEnabled) {
      throw new BadRequestException("2FA allaqachon yoqilgan. Avval o'chiring.");
    }

    const secret = generateTotpSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFaSecret: secret },
    });

    const accountLabel = user.email ?? user.phone ?? userId;
    return { secret, otpauthUrl: buildOtpAuthUrl(secret, accountLabel) };
  }

  /**
   * 2-qadam: authenticator kodini tekshiradi va 2FA'ni yoqadi.
   */
  async enable(userId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (user.isTwoFaEnabled) {
      throw new BadRequestException('2FA allaqachon yoqilgan');
    }
    if (!user.twoFaSecret) {
      throw new BadRequestException("Avval 2FA o'rnatilishi (setup) kerak");
    }
    if (!verifyTotp(user.twoFaSecret, code)) {
      throw new UnauthorizedException("Noto'g'ri tasdiqlash kodi");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isTwoFaEnabled: true },
    });

    await this.auditLogs.createLog({
      userId,
      action: 'UPDATE',
      entityType: 'User',
      entityId: userId,
      metadata: { event: 'TWO_FA_ENABLED' },
    });
    this.logger.log(`2FA yoqildi (user=${userId})`);
  }

  /**
   * 2FA'ni o'chiradi — parol tasdig'ini talab qiladi (qurilma o'g'irlangan
   * holatda ham himoya). Sirni ham tozalaydi.
   */
  async disable(userId: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (!user.isTwoFaEnabled) {
      throw new BadRequestException('2FA yoqilmagan');
    }

    const passwordOk = await verifyPassword(user.passwordHash, password);
    if (!passwordOk) {
      throw new UnauthorizedException("Noto'g'ri parol");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isTwoFaEnabled: false, twoFaSecret: null },
    });

    await this.auditLogs.createLog({
      userId,
      action: 'UPDATE',
      entityType: 'User',
      entityId: userId,
      metadata: { event: 'TWO_FA_DISABLED' },
    });
    this.logger.log(`2FA o'chirildi (user=${userId})`);
  }
}
