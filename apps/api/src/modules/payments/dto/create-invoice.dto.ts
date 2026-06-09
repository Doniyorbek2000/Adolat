import { ApiProperty } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Target subscription plan ID' })
  @IsUUID()
  planId!: string;

  @ApiProperty({ enum: PaymentProvider, description: 'Payment provider: CLICK or PAYME' })
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;
}
