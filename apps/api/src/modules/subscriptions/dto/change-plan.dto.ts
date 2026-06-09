import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ChangePlanDto {
  @ApiProperty({ description: 'Target subscription plan ID' })
  @IsUUID()
  planId!: string;
}
