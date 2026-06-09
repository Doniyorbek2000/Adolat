import { ApiPropertyOptional } from '@nestjs/swagger';
import { SupportPriority, SupportTicketStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateTicketDto {
  @ApiPropertyOptional({ enum: SupportTicketStatus, description: 'New ticket status' })
  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;

  @ApiPropertyOptional({ enum: SupportPriority, description: 'Ticket priority' })
  @IsOptional()
  @IsEnum(SupportPriority)
  priority?: SupportPriority;

  @ApiPropertyOptional({ description: 'Admin ID to assign the ticket to' })
  @IsOptional()
  @IsString()
  assignedAdminId?: string;
}
