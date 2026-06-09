import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { SupportService } from './support.service';

class SendMessageDto {
  @ApiProperty({ description: 'Message content', minLength: 1 })
  @IsString()
  @MinLength(1)
  content!: string;
}

@ApiTags('support')
@ApiBearerAuth()
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  @ApiCreatedResponse({ description: 'Support ticket created' })
  createTicket(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTicketDto,
  ) {
    return this.supportService.createTicket(user.id, dto);
  }

  @Get('tickets')
  @ApiOkResponse({ description: "User's support tickets" })
  getTickets(@CurrentUser() user: RequestUser) {
    return this.supportService.getUserTickets(user.id);
  }

  @Get('tickets/:id')
  @ApiOkResponse({ description: 'Support ticket with messages' })
  getTicket(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.supportService.getTicket(user.id, id);
  }

  @Post('tickets/:id/messages')
  @ApiCreatedResponse({ description: 'Message sent to support ticket' })
  sendMessage(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.supportService.sendMessage(user.id, id, dto.content);
  }
}
