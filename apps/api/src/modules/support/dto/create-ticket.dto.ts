import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({ description: 'Ticket subject', minLength: 5 })
  @IsString()
  @MinLength(5)
  subject!: string;

  @ApiPropertyOptional({ description: 'Ticket category (e.g., billing, technical, general)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Initial message body', minLength: 10 })
  @IsString()
  @MinLength(10)
  initialMessage!: string;
}
