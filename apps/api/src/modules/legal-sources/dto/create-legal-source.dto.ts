import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsObject, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { LegalSourceType } from '@prisma/client';

export class CreateLegalSourceDto {
  @ApiProperty({ description: 'Source name' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: LegalSourceType, description: 'Legal source type' })
  @IsEnum(LegalSourceType)
  type!: LegalSourceType;

  @ApiProperty({ description: 'Base URL of the source' })
  @IsUrl()
  baseUrl!: string;

  @ApiPropertyOptional({ description: 'Description of the source' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Sync interval in hours', default: 24 })
  @IsOptional()
  @IsInt()
  @Min(1)
  syncIntervalHours?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
