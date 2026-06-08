import { registerAs } from '@nestjs/config';

export interface StorageSettings {
  s3: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKey: string;
    secretKey: string;
  };
}

/** S3-mos fayl xotirasi (hujjatlar, audio, avatarlar) — Document Analyzer bosqichida ishlatiladi. */
export default registerAs(
  'storage',
  (): StorageSettings => ({
    s3: {
      endpoint: process.env.S3_ENDPOINT ?? '',
      region: process.env.S3_REGION ?? '',
      bucket: process.env.S3_BUCKET ?? '',
      accessKey: process.env.S3_ACCESS_KEY ?? '',
      secretKey: process.env.S3_SECRET_KEY ?? '',
    },
  }),
);
