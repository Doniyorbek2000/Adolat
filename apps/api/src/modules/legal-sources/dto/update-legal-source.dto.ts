import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { LegalSourceStatus } from '@prisma/client';
import { CreateLegalSourceDto } from './create-legal-source.dto';

export class UpdateLegalSourceDto extends PartialType(CreateLegalSourceDto) {
  @IsOptional()
  @IsEnum(LegalSourceStatus)
  status?: LegalSourceStatus;
}
