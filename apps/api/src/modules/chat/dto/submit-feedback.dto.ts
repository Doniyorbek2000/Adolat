import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum FeedbackValue {
  UP = 'up',
  DOWN = 'down',
}

export class SubmitFeedbackDto {
  @ApiProperty({ enum: FeedbackValue, description: "Baho: 'up' yoki 'down'" })
  @IsEnum(FeedbackValue)
  feedback: FeedbackValue;
}
