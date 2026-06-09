import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

import { AiContextItemDto } from './ai-context-item.dto';

export enum AnswerLanguage {
  UZ = 'UZ',
  RU = 'RU',
}

export class GenerateAnswerDto {
  @ApiProperty({ description: 'Foydalanuvchi savoli (min 3 belgi)', minLength: 3 })
  @IsString()
  @MinLength(3)
  question!: string;

  @ApiProperty({ enum: AnswerLanguage, description: 'Javob tili' })
  @IsEnum(AnswerLanguage)
  language!: AnswerLanguage;

  @ApiProperty({ type: [AiContextItemDto], description: 'RAG context (rasmiy manbalar)' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AiContextItemDto)
  context!: AiContextItemDto[];

  @ApiPropertyOptional({ description: 'Foydalanuvchi ID (optional, CurrentUserdan olinadi)' })
  @IsOptional()
  @IsString()
  userId?: string;
}
