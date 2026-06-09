import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('invoice')
  @ApiCreatedResponse({ description: 'Invoice created and payment URL returned' })
  createInvoice(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.paymentsService.createInvoice(user.id, dto);
  }

  @Get('history')
  @ApiOkResponse({ description: "User's payment history" })
  getHistory(@CurrentUser() user: RequestUser) {
    return this.paymentsService.getHistory(user.id);
  }

  @Post('click/webhook')
  @Public()
  @ApiOkResponse({ description: 'Click webhook received' })
  handleClickWebhook(
    @Body() payload: unknown,
    @Headers('x-click-signature') signature?: string,
  ) {
    return this.paymentsService.handleClickWebhook(payload, signature);
  }

  @Post('payme/webhook')
  @Public()
  @ApiOkResponse({ description: 'Payme webhook received' })
  handlePaymeWebhook(
    @Body() payload: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    return this.paymentsService.handlePaymeWebhook(payload, authorization);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Invoice details' })
  getInvoice(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.getInvoice(user.id, id);
  }
}
