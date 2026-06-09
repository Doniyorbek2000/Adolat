import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanCode, PromoType } from '@prisma/client';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePromoCodeDto {
  @ApiProperty({ description: 'Unique promo code string', example: 'SUMMER2024' })
  @IsString()
  @Length(2, 64)
  code!: string;

  @ApiProperty({ enum: PromoType, description: 'Promo type' })
  @IsEnum(PromoType)
  type!: PromoType;

  @ApiPropertyOptional({ description: 'Discount percentage (for DISCOUNT type)', minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({ enum: PlanCode, description: 'Free plan code (for FREE_PLAN type)' })
  @IsOptional()
  @IsEnum(PlanCode)
  freePlanCode?: PlanCode;

  @ApiPropertyOptional({ description: 'Extra usage amount (for EXTRA_USAGE type)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  extraUsageAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum total redemptions' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @ApiPropertyOptional({ description: 'Expiry date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Is the promo code active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePromoCodeDto {
  @ApiPropertyOptional({ description: 'Is the promo code active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Maximum total redemptions' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @ApiPropertyOptional({ description: 'Expiry date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;
}
