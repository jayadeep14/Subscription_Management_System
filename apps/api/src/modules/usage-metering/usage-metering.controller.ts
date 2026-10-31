import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiKeyGuard, RequireApiScopes, TenantRequest } from '../../common/api-key.guard.js';
import { UsageEventDto } from './usage-event.dto.js';
import { UsageSummaryDto } from './usage-summary.dto.js';
import { UsageMeteringService } from './usage-metering.service.js';

@Controller('usage')
@UseGuards(ApiKeyGuard)
export class UsageMeteringController {
  constructor(private readonly usage: UsageMeteringService) {}

  @Post('events')
  @RequireApiScopes('usage:write')
  ingest(@Req() request: TenantRequest, @Body() dto: UsageEventDto) {
    return this.usage.ingest(request.tenantId, dto);
  }

  @Get('summary')
  @RequireApiScopes('usage:read')
  summary(
    @Req() request: TenantRequest,
    @Query() query: UsageSummaryDto,
  ) {
    return this.usage.summary(request.tenantId, query.subscriptionId, query.meterId, new Date(query.from), new Date(query.to));
  }
}
