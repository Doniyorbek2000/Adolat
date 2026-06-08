import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Avval berilgan refresh token' })
  @IsString()
  refreshToken!: string;
}
