import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { OtpType } from '@prisma/client';

export class ResendOtpDto {
  @ApiProperty({ example: '+998901234567', description: 'Telefon raqami yoki email manzili' })
  @IsString()
  target!: string;

  @ApiProperty({ enum: OtpType, example: OtpType.REGISTER })
  @IsEnum(OtpType)
  type!: OtpType;
}
