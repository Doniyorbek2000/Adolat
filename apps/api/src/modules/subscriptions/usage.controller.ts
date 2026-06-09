import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('usage')
@ApiBearerAuth()
@Controller('usage')
export class UsageController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('me')
  @ApiOkResponse({ description: "User's current usage counter for the active billing period" })
  getMyUsage(@CurrentUser() user: RequestUser) {
    return this.subscriptionsService.getCurrentUsage(user.id);
  }
}
