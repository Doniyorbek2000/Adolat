import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({ description: 'Google Sign-In ID token' })
  @IsString()
  @MinLength(10)
  idToken!: string;
}
