import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * The actual file comes via @UploadedFile() / multipart.
 * This DTO carries optional metadata sent alongside.
 */
export class UploadFileDto {
  @ApiPropertyOptional({ description: 'Optional description for the uploaded file' })
  @IsOptional()
  @IsString()
  description?: string;
}
