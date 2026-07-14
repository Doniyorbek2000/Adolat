import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { JWT } from 'google-auth-library';

/**
 * Firebase Cloud Messaging HTTP v1 API.
 *
 * Eski legacy API (`https://fcm.googleapis.com/fcm/send` + server key) Google
 * tomonidan 2024-yil iyunda o'chirilgan. Bu xizmat rasmiy HTTP v1 API'dan
 * foydalanadi: service account orqali OAuth2 access-token olinadi va
 * `.../v1/projects/{projectId}/messages:send` endpointiga yuboriladi.
 *
 * Kerakli .env qiymatlari:
 *   FCM_PROJECT_ID     — Firebase loyiha ID
 *   FCM_CLIENT_EMAIL   — service account email
 *   FCM_PRIVATE_KEY    — service account private key (\n bilan)
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly projectId: string;
  private readonly jwtClient: JWT | null;

  private static readonly FCM_SCOPE =
    'https://www.googleapis.com/auth/firebase.messaging';

  constructor(private readonly configService: ConfigService) {
    this.projectId = this.configService.get<string>('FCM_PROJECT_ID', '');
    const clientEmail = this.configService.get<string>('FCM_CLIENT_EMAIL', '');
    // .env'da private key odatda bitta qatorda \n sifatida saqlanadi
    const privateKey = this.configService
      .get<string>('FCM_PRIVATE_KEY', '')
      .replace(/\\n/g, '\n');

    if (this.projectId && clientEmail && privateKey) {
      this.jwtClient = new JWT({
        email: clientEmail,
        key: privateKey,
        scopes: [PushService.FCM_SCOPE],
      });
      this.logger.log('FCM HTTP v1 push xizmati tayyor');
    } else {
      this.jwtClient = null;
      this.logger.warn(
        "FCM service account sozlanmagan (FCM_PROJECT_ID/FCM_CLIENT_EMAIL/FCM_PRIVATE_KEY) — push bildirishnomalar o'chirilgan",
      );
    }
  }

  private get sendUrl(): string {
    return `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;
  }

  /**
   * OAuth2 access-token oladi. google-auth-library tokenni ichki keshlaydi va
   * muddati tugaganda avtomatik yangilaydi.
   */
  private async getAccessToken(): Promise<string | null> {
    if (!this.jwtClient) return null;
    try {
      const { token } = await this.jwtClient.getAccessToken();
      return token ?? null;
    } catch (error) {
      this.logger.error(
        `FCM access-token olishda xatolik: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private buildMessage(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Record<string, unknown> {
    return {
      message: {
        token,
        notification: { title, body },
        // HTTP v1'da data qiymatlari faqat string bo'lishi shart
        data: data ?? {},
      },
    };
  }

  async sendToDevice(
    deviceToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      this.logger.warn('FCM sozlanmagan — push bildirishnoma yuborilmadi');
      return;
    }

    try {
      await axios.post(
        this.sendUrl,
        this.buildMessage(deviceToken, title, body, data),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      this.logger.log(`Push bildirishnoma yuborildi: ${title}`);
    } catch (error) {
      this.logger.error(
        `Push bildirishnoma yuborishda xatolik: ${this.describeError(error)}`,
      );
    }
  }

  /**
   * HTTP v1 bitta so'rovda faqat bitta token qabul qiladi, shuning uchun har
   * bir qurilmaga alohida yuboriladi (parallel, xatolar bir-birini to'xtatmaydi).
   */
  async sendToMultipleDevices(
    deviceTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (deviceTokens.length === 0) return;

    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      this.logger.warn('FCM sozlanmagan — push bildirishnomalar yuborilmadi');
      return;
    }

    const results = await Promise.allSettled(
      deviceTokens.map((token) =>
        axios.post(this.sendUrl, this.buildMessage(token, title, body, data), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      ),
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    const sent = results.length - failed;
    this.logger.log(
      `Push bildirishnoma: ${sent} ta yuborildi, ${failed} ta muvaffaqiyatsiz (${title})`,
    );
  }

  private describeError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      return `${error.response?.status ?? ''} ${JSON.stringify(error.response?.data ?? error.message)}`;
    }
    return (error as Error).message;
  }
}
