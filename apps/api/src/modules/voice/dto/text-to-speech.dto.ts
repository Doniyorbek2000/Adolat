import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MinLength } from 'class-validator';
import { Language } from '@prisma/client';

export class TextToSpeechDto {
  @ApiProperty({ description: 'Ovozga aylantirilishi kerak bo\'lgan matn', minLength: 1 })
  @IsString()
  @MinLength(1)
  text!: string;

  @ApiProperty({ enum: Language, description: 'Ovoz tili' })
  @IsEnum(Language)
  language!: Language;
}
