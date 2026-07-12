import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FileStatus, UploadedFile } from '@prisma/client';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../../database/prisma/prisma.service';
import { StorageService } from './storage/storage.service';

/** Maximum allowed file size: 50 MB */
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/** Allowed MIME types */
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'text/plain', // .txt
  'application/rtf', // .rtf
  'text/rtf',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/x-wav',
  'audio/x-m4a',
  // Rasm (OCR uchun — passport, ID, skaner, foto)
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/tiff',
]);

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ─── Validation ─────────────────────────────────────────────────────────────

  validateFileType(mimeType: string): void {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(
        `Fayl turi qo'llab-quvvatlanmaydi: ${mimeType}. ` +
          `Ruxsat etilganlar: PDF, DOCX, DOC, TXT, RTF, audio fayllar.`,
      );
    }
  }

  validateFileSize(sizeBytes: number): void {
    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `Fayl hajmi ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB dan oshmasligi kerak.`,
      );
    }
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async upload(userId: string, file: Express.Multer.File): Promise<UploadedFile> {
    this.validateFileType(file.mimetype);
    this.validateFileSize(file.size);

    const ext = file.originalname.split('.').pop() ?? 'bin';
    const storageKey = `users/${userId}/${uuidv4()}.${ext}`;
    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Upload to storage
    await this.storage.upload(storageKey, file.buffer, file.mimetype);

    const uploaded = await this.prisma.uploadedFile.create({
      data: {
        userId,
        storageKey,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        checksum,
        status: FileStatus.UPLOADED,
      },
    });

    this.logger.log(`File uploaded: ${uploaded.id} for user ${userId}`);
    return uploaded;
  }

  async getFiles(userId: string): Promise<UploadedFile[]> {
    return this.prisma.uploadedFile.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFile(userId: string, fileId: string): Promise<UploadedFile> {
    const file = await this.prisma.uploadedFile.findFirst({
      where: { id: fileId, deletedAt: null },
    });

    if (!file) {
      throw new NotFoundException('Fayl topilmadi');
    }

    if (file.userId !== userId) {
      throw new ForbiddenException('Bu faylga kirish taqiqlangan');
    }

    return file;
  }

  async getSignedUrl(userId: string, fileId: string): Promise<{ url: string }> {
    const file = await this.getFile(userId, fileId);
    const url = await this.storage.getSignedUrl(file.storageKey, 3600);
    return { url };
  }

  async delete(userId: string, fileId: string): Promise<void> {
    const file = await this.getFile(userId, fileId);

    // Soft-delete the DB record
    await this.prisma.uploadedFile.update({
      where: { id: fileId },
      data: {
        deletedAt: new Date(),
        status: FileStatus.DELETED,
      },
    });

    // Best-effort delete from storage
    try {
      await this.storage.delete(file.storageKey);
    } catch (err) {
      this.logger.warn(`Storage delete failed for key ${file.storageKey}: ${String(err)}`);
    }
  }

  // ─── Internal helpers ────────────────────────────────────────────────────────

  /**
   * Get file with ownership check — used by other modules (document-analyzer, voice).
   */
  async getFileForProcessing(
    userId: string,
    fileId: string,
  ): Promise<{ file: UploadedFile; localPath: string }> {
    const file = await this.getFile(userId, fileId);
    const localPath = this.storage.getLocalPath(file.storageKey);
    return { file, localPath };
  }

  /**
   * Retrieve the raw buffer of a file from storage.
   * Works for both S3 (downloads via local path fallback) and local storage.
   */
  async getFileBuffer(fileId: string, userId: string): Promise<Buffer> {
    const file = await this.getFile(userId, fileId);

    if (this.storage.isConfigured) {
      // For S3, fall back to local path if file was already written; otherwise caller must
      // handle streaming. For simplicity, we try the local path first.
      const localPath = this.storage.getLocalPath(file.storageKey);
      const { existsSync, readFileSync } = await import('fs');
      if (existsSync(localPath)) {
        return Buffer.from(readFileSync(localPath));
      }
      // If not locally cached, this throws — caller should use signed URL instead
      throw new NotFoundException(
        'Fayl mahalliy xotirada topilmadi. Imzolangan URL orqali yuklab oling.',
      );
    }

    const { existsSync, readFileSync } = await import('fs');
    const localPath = this.storage.getLocalPath(file.storageKey);
    if (!existsSync(localPath)) {
      throw new NotFoundException('Fayl topilmadi');
    }
    return Buffer.from(readFileSync(localPath));
  }
}
