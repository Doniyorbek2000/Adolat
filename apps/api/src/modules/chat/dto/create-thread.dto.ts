import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Language } from '@prisma/client';

export class CreateThreadDto {
  @ApiPropertyOptional({ description: 'Mavzu sarlavhasi (ixtiyoriy)' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ enum: Language, description: 'Chat tili' })
  @IsEnum(Language)
  language: Language;
}
