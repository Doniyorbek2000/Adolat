import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MinLength } from 'class-validator';
import { Language } from '@prisma/client';

export class SendMessageDto {
  @ApiProperty({ description: "Foydalanuvchi savoli (kamida 2 belgi)", minLength: 2 })
  @IsString()
  @MinLength(2)
  question: string;

  @ApiProperty({ enum: Language, description: 'Javob tili' })
  @IsEnum(Language)
  language: Language;
}
