import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export class ResetPasswordDto {
  @ApiProperty({ example: '+998901234567', description: 'Telefon raqami yoki email manzili' })
  @IsString()
  target!: string;

  @ApiProperty({ example: '123456', minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6, { message: "Tasdiqlash kodi 6 xonali bo'lishi kerak" })
  code!: string;

  @ApiProperty({
    example: 'NewStrongPass123!',
    description: "Kamida 8 belgi, katta-kichik harf va raqamdan iborat bo'lishi kerak",
  })
  @IsString()
  @Matches(STRONG_PASSWORD_PATTERN, {
    message: "Parol kamida 8 belgi, kichik harf, katta harf va raqamdan iborat bo'lishi kerak",
  })
  newPassword!: string;
}
