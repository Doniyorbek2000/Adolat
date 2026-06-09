import { SetMetadata } from '@nestjs/common';

export const USAGE_TYPE_KEY = 'usageType';

export type UsageType = 'questionsUsed' | 'analysesUsed' | 'documentsUsed' | 'voiceSecondsUsed';

/**
 * Marks a route handler with the usage type to check/increment before allowing access.
 * Used together with UsageGuard.
 *
 * Example:
 *   @UseGuards(UsageGuard)
 *   @UsageType('questionsUsed')
 *   async sendMessage(...) {}
 */
export const UsageType = (type: UsageType): MethodDecorator =>
  SetMetadata(USAGE_TYPE_KEY, type);
