import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: '+998901234567', description: 'Telefon raqami yoki email manzili' })
  @IsString()
  target!: string;
}
