import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { ApplyPromoDto } from './dto/apply-promo.dto';
import { PromoService } from './promo.service';

@ApiTags('promo')
@ApiBearerAuth()
@Controller('promo')
export class PromoController {
  constructor(private readonly promoService: PromoService) {}

  @Post('apply')
  @ApiCreatedResponse({ description: 'Promo code applied successfully' })
  apply(
    @CurrentUser() user: RequestUser,
    @Body() dto: ApplyPromoDto,
  ) {
    return this.promoService.apply(user.id, dto.code);
  }
}
