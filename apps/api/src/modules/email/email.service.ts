import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<string>('SMTP_PORT');

    if (host && port) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Number(port) === 465,
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
      this.logger.log('SMTP transport yaratildi');
    } else {
      this.logger.warn('SMTP sozlamalari topilmadi — email xizmati o\'chirilgan');
    }
  }

  async sendOtpEmail(to: string, otpCode: string): Promise<void> {
    const subject = 'Adolat AI — Tasdiqlash kodi';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a56db; text-align: center;">Adolat AI</h2>
        <p>Assalomu alaykum!</p>
        <p>Sizning tasdiqlash kodingiz:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #f3f4f6; padding: 12px 24px; border-radius: 8px;">
            ${otpCode}
          </span>
        </div>
        <p>Bu kod 5 daqiqa ichida amal qiladi.</p>
        <p style="color: #6b7280; font-size: 13px;">
          Agar siz bu kodni so'ramagan bo'lsangiz, ushbu xabarni e'tiborsiz qoldiring.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">Adolat AI — Huquqiy yordamchi</p>
      </div>
    `;

    await this.send(to, subject, html);
  }

  async sendPasswordResetEmail(to: string, otpCode: string): Promise<void> {
    const subject = 'Adolat AI — Parolni tiklash kodi';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a56db; text-align: center;">Adolat AI</h2>
        <p>Assalomu alaykum!</p>
        <p>Parolni tiklash uchun kod:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #f3f4f6; padding: 12px 24px; border-radius: 8px;">
            ${otpCode}
          </span>
        </div>
        <p>Bu kod 5 daqiqa ichida amal qiladi.</p>
        <p style="color: #6b7280; font-size: 13px;">
          Agar siz parolni tiklashni so'ramagan bo'lsangiz, ushbu xabarni e'tiborsiz qoldiring
          va hisobingiz xavfsizligini tekshiring.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">Adolat AI — Huquqiy yordamchi</p>
      </div>
    `;

    await this.send(to, subject, html);
  }

  async sendWelcomeEmail(to: string, fullName: string): Promise<void> {
    const subject = 'Adolat AI — Xush kelibsiz!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a56db; text-align: center;">Adolat AI</h2>
        <p>Hurmatli ${fullName},</p>
        <p>Adolat AI platformasiga xush kelibsiz!</p>
        <p>
          Adolat AI — bu sun'iy intellektga asoslangan huquqiy yordamchi.
          Siz qonunlar, huquqiy hujjatlar va yuridik masalalar bo'yicha savollaringizga
          tezkor javob olishingiz mumkin.
        </p>
        <h3 style="color: #374151;">Platformaning imkoniyatlari:</h3>
        <ul style="color: #4b5563; line-height: 1.8;">
          <li>Huquqiy savollarga AI yordamida javob olish</li>
          <li>Hujjatlarni tahlil qilish</li>
          <li>Yuridik hujjatlarni yaratish</li>
          <li>Ovozli maslahat</li>
        </ul>
        <p>Savollaringiz bo'lsa, ilovadagi "Yordam" bo'limiga murojaat qiling.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">Adolat AI — Huquqiy yordamchi</p>
      </div>
    `;

    await this.send(to, subject, html);
  }

  async sendNotificationEmail(to: string, title: string, body: string): Promise<void> {
    const subject = `Adolat AI — ${title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a56db; text-align: center;">Adolat AI</h2>
        <h3 style="color: #374151;">${title}</h3>
        <p style="color: #4b5563; line-height: 1.6;">${body}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">Adolat AI — Huquqiy yordamchi</p>
      </div>
    `;

    await this.send(to, subject, html);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`SMTP sozlanmagan — email yuborilmadi: ${to}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"Adolat AI" <${this.configService.get<string>('SMTP_USER')}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Email yuborildi: ${to} — ${subject}`);
    } catch (error) {
      this.logger.error(`Email yuborishda xatolik (${to}): ${error.message}`, error.stack);
    }
  }
}
