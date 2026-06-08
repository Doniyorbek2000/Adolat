import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LogoutDto {
  @ApiProperty({ description: 'Tizimdan chiqilayotgan sessiyaga tegishli refresh token' })
  @IsString()
  refreshToken!: string;
}
