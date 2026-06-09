import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client | null = null;
  private readonly bucket: string;
  private readonly localDir = path.join(process.cwd(), 'uploads');

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT') ?? '';
    const region = this.config.get<string>('S3_REGION') ?? 'us-east-1';
    const accessKey = this.config.get<string>('S3_ACCESS_KEY') ?? '';
    const secretKey = this.config.get<string>('S3_SECRET_KEY') ?? '';
    this.bucket = this.config.get<string>('S3_BUCKET') ?? '';

    if (this.bucket) {
      this.s3 = new S3Client({
        endpoint: endpoint || undefined,
        region,
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        },
        forcePathStyle: !!endpoint,
      });
      this.logger.log(`S3 storage configured — bucket: ${this.bucket}`);
    } else {
      this.logger.warn('S3_BUCKET not configured — using local file storage');
      fs.mkdirSync(this.localDir, { recursive: true });
    }
  }

  get isConfigured(): boolean {
    return !!this.bucket && this.s3 !== null;
  }

  /**
   * Upload file to S3 or local disk.
   * Returns the storage key.
   */
  async upload(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    if (this.isConfigured && this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );
      this.logger.debug(`Uploaded to S3: ${key}`);
    } else {
      const filePath = path.join(this.localDir, key.replace(/\//g, '_'));
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, buffer);
      this.logger.debug(`Saved locally: ${filePath}`);
    }
    return key;
  }

  /**
   * Generate a pre-signed download URL (S3) or a local file path string.
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (this.isConfigured && this.s3) {
      const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
      return getSignedUrl(this.s3, command, { expiresIn });
    }
    // Local fallback: return a pseudo-URL path for the caller to handle
    return `/uploads/${key.replace(/\//g, '_')}`;
  }

  /**
   * Delete object from S3 or local disk.
   */
  async delete(key: string): Promise<void> {
    if (this.isConfigured && this.s3) {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      this.logger.debug(`Deleted from S3: ${key}`);
    } else {
      const filePath = path.join(this.localDir, key.replace(/\//g, '_'));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.debug(`Deleted locally: ${filePath}`);
      }
    }
  }

  /**
   * Read file buffer from local storage (used by document analyzer for local files).
   */
  getLocalPath(key: string): string {
    return path.join(this.localDir, key.replace(/\//g, '_'));
  }
}
