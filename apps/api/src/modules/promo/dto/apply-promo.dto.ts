import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ApplyPromoDto {
  @ApiProperty({ description: 'Promo code string', example: 'SUMMER2024' })
  @IsString()
  @Length(1, 64)
  code!: string;
}
