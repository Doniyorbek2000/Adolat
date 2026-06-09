import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LegalSourceType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateLegalDocumentDto {
  @ApiProperty({ description: 'Hujjat sarlavhasi', minLength: 3 })
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiPropertyOptional({ description: 'Kategoriya (masalan: mehnat, soliq, mulk)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: "Manba URL — asl hujjat manzili" })
  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @ApiProperty({ description: "Hujjat to'liq matni (min 10 belgi)", minLength: 10 })
  @IsString()
  @MinLength(10)
  content!: string;

  @ApiPropertyOptional({ enum: LegalSourceType, description: 'Hujjat turi' })
  @IsOptional()
  @IsEnum(LegalSourceType)
  sourceType?: LegalSourceType;
}
