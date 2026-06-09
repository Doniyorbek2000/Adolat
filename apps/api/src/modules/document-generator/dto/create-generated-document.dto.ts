import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsObject, IsString } from 'class-validator';
import { Language } from '@prisma/client';

export class CreateGeneratedDocumentDto {
  @ApiProperty({
    description: "Hujjat turi: 'ariza' | 'shikoyat' | 'da_vo_arizasi' | 'shartnoma' | 'ishonchnoma' | 'boshqa'",
    example: 'ariza',
  })
  @IsString()
  documentType!: string;

  @ApiProperty({
    description: "Forma ma'lumotlari (key-value juftliklari)",
    example: { fullName: 'Abdullayev Ali', address: 'Toshkent, Yunusobod tumani' },
  })
  @IsObject()
  formAnswers!: Record<string, string>;

  @ApiProperty({ enum: Language, description: 'Hujjat tili' })
  @IsEnum(Language)
  language!: Language;
}
