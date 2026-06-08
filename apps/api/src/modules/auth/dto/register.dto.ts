import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Language } from '@prisma/client';

const PHONE_PATTERN = /^\+998\d{9}$/;
const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export class RegisterDto {
  @ApiProperty({ example: 'Ali', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Valiyev', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional({ example: '+998901234567', description: "O'zbekiston formatidagi telefon raqami" })
  @IsOptional()
  @Matches(PHONE_PATTERN, { message: "Telefon raqami +998XXXXXXXXX formatida bo'lishi kerak" })
  phone?: string;

  @ApiPropertyOptional({ example: 'ali@example.com' })
  @IsOptional()
  @IsEmail({}, { message: "Email manzili noto'g'ri formatda" })
  email?: string;

  @ApiProperty({
    example: 'StrongPass123!',
    description: "Kamida 8 belgi, katta-kichik harf va raqamdan iborat bo'lishi kerak",
  })
  @IsString()
  @Matches(STRONG_PASSWORD_PATTERN, {
    message: "Parol kamida 8 belgi, kichik harf, katta harf va raqamdan iborat bo'lishi kerak",
  })
  password!: string;

  @ApiProperty({ enum: Language, example: Language.UZ })
  @IsEnum(Language)
  language!: Language;
}
