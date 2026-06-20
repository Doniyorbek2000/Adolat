import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const FCM_SEND_URL = 'https://fcm.googleapis.com/fcm/send';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly fcmServerKey: string;

  constructor(private readonly configService: ConfigService) {
    this.fcmServerKey = this.configService.get<string>('FCM_SERVER_KEY', '');

    if (!this.fcmServerKey) {
      this.logger.warn('FCM_SERVER_KEY topilmadi — push bildirishnomalar o\'chirilgan');
    } else {
      this.logger.log('FCM push xizmati tayyor');
    }
  }

  async sendToDevice(
    deviceToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.fcmServerKey) {
      this.logger.warn('FCM sozlanmagan — push bildirishnoma yuborilmadi');
      return;
    }

    try {
      const payload = {
        to: deviceToken,
        notification: { title, body },
        data: data ?? {},
      };

      await axios.post(FCM_SEND_URL, payload, {
        headers: {
          Authorization: `key=${this.fcmServerKey}`,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`Push bildirishnoma yuborildi: ${title}`);
    } catch (error) {
      this.logger.error(
        `Push bildirishnoma yuborishda xatolik: ${error.message}`,
        error.stack,
      );
    }
  }

  async sendToMultipleDevices(
    deviceTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.fcmServerKey) {
      this.logger.warn('FCM sozlanmagan — push bildirishnomalar yuborilmadi');
      return;
    }

    if (deviceTokens.length === 0) {
      return;
    }

    try {
      const payload = {
        registration_ids: deviceTokens,
        notification: { title, body },
        data: data ?? {},
      };

      await axios.post(FCM_SEND_URL, payload, {
        headers: {
          Authorization: `key=${this.fcmServerKey}`,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(
        `Push bildirishnoma ${deviceTokens.length} ta qurilmaga yuborildi: ${title}`,
      );
    } catch (error) {
      this.logger.error(
        `Push bildirishnomalar yuborishda xatolik: ${error.message}`,
        error.stack,
      );
    }
  }
}
