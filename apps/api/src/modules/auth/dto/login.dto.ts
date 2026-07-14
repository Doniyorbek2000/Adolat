import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '+998901234567', description: 'Telefon raqami yoki email manzili' })
  @IsString()
  identifier!: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  password!: string;

  @ApiPropertyOptional({
    example: 'iPhone 15 Pro',
    description: 'Foydalanuvchi qurilmasining nomi (ixtiyoriy)',
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-device-id', description: 'Qurilma identifikatori (ixtiyoriy)' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({
    example: '123456',
    description: '2FA yoqilgan hisoblar uchun authenticator kodi (6 raqam)',
  })
  @IsOptional()
  @IsString()
  twoFaCode?: string;
}
