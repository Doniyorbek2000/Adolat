import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { LegalSourceType } from '@prisma/client';

export class RagQueryDto {
  @ApiProperty({ description: 'The legal question to retrieve context for' })
  @IsString()
  query!: string;

  @ApiProperty({ enum: ['UZ', 'RU'], description: 'Response language' })
  @IsEnum(['UZ', 'RU'])
  language!: 'UZ' | 'RU';

  @ApiPropertyOptional({
    enum: LegalSourceType,
    isArray: true,
    description: 'Filter context to specific source types',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(LegalSourceType, { each: true })
  sourceTypes?: LegalSourceType[];
}
