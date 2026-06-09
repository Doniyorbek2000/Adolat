import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Language } from '@prisma/client';

export class VoiceAskDto {
  @ApiProperty({ enum: Language, description: 'Audio va javob tili' })
  @IsEnum(Language)
  language!: Language;
}
