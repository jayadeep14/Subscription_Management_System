import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { DatabaseModule } from '../database/database.module.js';
import { UsageMeteringModule } from './usage-metering/usage-metering.module.js';

@Module({ imports: [DatabaseModule, UsageMeteringModule], controllers: [HealthController] })
export class AppModule {}
