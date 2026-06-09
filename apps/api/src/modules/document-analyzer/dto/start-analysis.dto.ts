import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { Language } from '@prisma/client';

export class StartAnalysisDto {
  @ApiProperty({ description: 'Tahlil qilinadigan fayl UUID' })
  @IsString()
  fileId!: string;

  @ApiProperty({ enum: Language, description: 'Tahlil natijasi tili' })
  @IsEnum(Language)
  language!: Language;
}
