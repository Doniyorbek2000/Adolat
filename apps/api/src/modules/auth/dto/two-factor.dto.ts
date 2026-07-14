import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class EnableTwoFactorDto {
  @ApiProperty({ example: '123456', description: 'Authenticator ilovasidagi 6 raqamli kod' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Kod 6 ta raqamdan iborat bo\'lishi kerak' })
  code!: string;
}

export class DisableTwoFactorDto {
  @ApiProperty({ example: 'StrongPass123!', description: 'Tasdiqlash uchun joriy parol' })
  @IsString()
  @Length(1, 200)
  password!: string;
}
