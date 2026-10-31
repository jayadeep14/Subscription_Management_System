import { IsDateString, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class UsageEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  eventId!: string;

  @IsUUID()
  customerId!: string;

  @IsUUID()
  subscriptionId!: string;

  @IsUUID()
  meterId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  idempotencyKey!: string;

  @Matches(/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/, { message: 'quantity must be a positive decimal with at most 8 fractional digits' })
  quantity!: string;

  @IsDateString()
  timestamp!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  source!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
