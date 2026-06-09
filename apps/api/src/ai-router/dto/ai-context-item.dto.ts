import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class AiContextItemDto {
  @ApiProperty({ description: 'Manba nomi (lex.uz, soliq.uz va h.k.)' })
  @IsString()
  @MinLength(1)
  sourceName!: string;

  @ApiProperty({ description: 'Hujjat sarlavhasi' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ description: 'Hujjat mazmuni (RAG chunk)' })
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiPropertyOptional({ description: 'Hujjat havolasi' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: 'Hujjat sanasi' })
  @IsOptional()
  @IsString()
  date?: string;
}
