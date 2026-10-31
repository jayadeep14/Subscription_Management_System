import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../../common/api-key.guard.js';
import { UsageMeteringController } from './usage-metering.controller.js';
import { UsageMeteringService } from './usage-metering.service.js';

@Module({
  controllers: [UsageMeteringController],
  providers: [ApiKeyGuard, UsageMeteringService],
})
export class UsageMeteringModule {}
