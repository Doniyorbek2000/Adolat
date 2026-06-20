import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePlanDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) priceUzs?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) billingPeriodDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) questionLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) documentAnalysisLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) generatedDocumentLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) voiceMinutesLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maxFileSizeMb?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() exportEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() prioritySupport?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
