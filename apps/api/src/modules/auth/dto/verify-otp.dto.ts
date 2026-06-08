import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Length } from 'class-validator';
import { OtpType } from '@prisma/client';

export class VerifyOtpDto {
  @ApiProperty({ example: '+998901234567', description: 'Telefon raqami yoki email manzili' })
  @IsString()
  target!: string;

  @ApiProperty({ example: '123456', minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6, { message: "Tasdiqlash kodi 6 xonali bo'lishi kerak" })
  code!: string;

  @ApiProperty({ enum: OtpType, example: OtpType.REGISTER })
  @IsEnum(OtpType)
  type!: OtpType;
}
