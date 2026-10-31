import { IsDateString, IsUUID } from 'class-validator';

export class UsageSummaryDto {
  @IsUUID()
  subscriptionId!: string;

  @IsUUID()
  meterId!: string;

  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}
