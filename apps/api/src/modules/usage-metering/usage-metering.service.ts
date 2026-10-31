import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '../../database/generated/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { setTenantContext } from '../../database/tenant-context.js';
import { UsageEventDto } from './usage-event.dto.js';
import { sameUsagePayload, utcBucket } from './usage-metering.util.js';

@Injectable()
export class UsageMeteringService {
  constructor(private readonly prisma: PrismaService) {}

  async ingest(tenantId: string, dto: UsageEventDto) {
    const timestamp = new Date(dto.timestamp);
    const quantity = new Prisma.Decimal(dto.quantity);
    if (!quantity.isFinite() || quantity.lte(0)) throw new ConflictException('Usage quantity must be greater than zero');
    const incoming = { ...dto, tenantId, timestamp, quantity: quantity.toString() };

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.client.$transaction(async (tx) => {
          await setTenantContext(tx, tenantId);
          const replay = await tx.usageEvent.findFirst({
            where: { OR: [{ eventId: dto.eventId }, { tenantId, idempotencyKey: dto.idempotencyKey }] },
          });
          if (replay) {
            if (replay.eventId === dto.eventId && sameUsagePayload(replay, incoming)) {
              return { accepted: true, duplicate: true, eventId: replay.eventId };
            }
            throw new ConflictException('eventId or idempotencyKey has already been used with different data');
          }

          const [meter, subscription] = await Promise.all([
            tx.usageMeter.findFirst({ where: { id: dto.meterId, tenantId, active: true } }),
            tx.subscription.findFirst({
              where: { id: dto.subscriptionId, tenantId, customerId: dto.customerId },
              select: { id: true },
            }),
          ]);
          if (!meter) throw new NotFoundException('Usage meter was not found for this tenant');
          if (!subscription) throw new NotFoundException('Subscription and customer were not found for this tenant');

          await tx.usageEvent.create({
            data: {
              eventId: dto.eventId,
              tenantId,
              customerId: dto.customerId,
              subscriptionId: dto.subscriptionId,
              meterId: dto.meterId,
              idempotencyKey: dto.idempotencyKey,
              quantity,
              occurredAt: timestamp,
              source: dto.source,
              metadata: dto.metadata as Prisma.InputJsonValue | undefined,
            },
          });

          for (const grain of ['HOURLY', 'DAILY'] as const) {
            const { start, end } = utcBucket(timestamp, grain);
            await tx.usageAggregate.upsert({
              where: {
                tenantId_meterId_subscriptionId_grain_periodStart: {
                  tenantId,
                  meterId: dto.meterId,
                  subscriptionId: dto.subscriptionId,
                  grain,
                  periodStart: start,
                },
              },
              create: {
                tenantId,
                meterId: dto.meterId,
                subscriptionId: dto.subscriptionId,
                grain,
                periodStart: start,
                periodEnd: end,
                quantity,
                eventCount: BigInt(1),
              },
              update: {
                quantity: { increment: quantity },
                eventCount: { increment: BigInt(1) },
                computedAt: new Date(),
              },
            });
          }
          return { accepted: true, duplicate: false, eventId: dto.eventId };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (error instanceof ConflictException || error instanceof NotFoundException) throw error;
        if (this.isUniqueViolation(error)) {
          const replay = await this.findTenantReplay(tenantId, dto.eventId, dto.idempotencyKey);
          if (replay && replay.eventId === dto.eventId && sameUsagePayload(replay, incoming)) {
            return { accepted: true, duplicate: true, eventId: replay.eventId };
          }
          throw new ConflictException('eventId or idempotencyKey has already been used');
        }
        if (this.isSerializationFailure(error) && attempt < 2) continue;
        if (this.isSerializationFailure(error)) throw new ServiceUnavailableException('Concurrent usage ingestion; retry with the same idempotency key');
        throw error;
      }
    }
    throw new ServiceUnavailableException('Usage ingestion could not be completed');
  }

  async summary(tenantId: string, subscriptionId: string, meterId: string, from: Date, to: Date) {
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to) {
      throw new BadRequestException('from and to must be valid timestamps, with from earlier than to');
    }
    return this.prisma.client.$transaction(async (tx) => {
      await setTenantContext(tx, tenantId);
      const raw = await tx.usageEvent.aggregate({
        where: { tenantId, subscriptionId, meterId, occurredAt: { gte: from, lt: to } },
        _sum: { quantity: true },
        _count: { _all: true },
      });
      const aggregates = await tx.usageAggregate.findMany({
        where: { tenantId, subscriptionId, meterId, grain: 'DAILY', periodStart: { gte: from }, periodEnd: { lte: to } },
        orderBy: { periodStart: 'asc' },
        select: { periodStart: true, periodEnd: true, quantity: true, eventCount: true },
      });
      const wholeUtcDays = [from, to].every((date) => date.getUTCHours() === 0
        && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0);
      const rawDaily = wholeUtcDays
        ? await tx.$queryRaw<Array<{ periodStart: Date; quantity: string; eventCount: bigint }>>`
            SELECT date_trunc('day', occurred_at) AS "periodStart",
                   COALESCE(SUM(quantity), 0)::text AS quantity,
                   COUNT(*)::bigint AS "eventCount"
            FROM usage_events
            WHERE tenant_id = ${tenantId}::uuid
              AND subscription_id = ${subscriptionId}::uuid
              AND meter_id = ${meterId}::uuid
              AND occurred_at >= ${from}
              AND occurred_at < ${to}
            GROUP BY date_trunc('day', occurred_at)
          `
        : [];
      const rawDailyByStart = new Map(rawDaily.map((row) => [row.periodStart.toISOString(), row]));
      const aggregateByStart = new Map(aggregates.map((row) => [row.periodStart.toISOString(), row]));
      const dailyStarts = [...new Set([...rawDailyByStart.keys(), ...aggregateByStart.keys()])].sort();
      const aggregateReconciliation = wholeUtcDays
        ? dailyStarts.map((periodStart) => {
            const rawRow = rawDailyByStart.get(periodStart);
            const aggregateRow = aggregateByStart.get(periodStart);
            const rawQuantity = new Prisma.Decimal(rawRow?.quantity ?? '0');
            const rawCount = rawRow?.eventCount ?? BigInt(0);
            return {
              periodStart: new Date(periodStart),
              rawQuantity: rawQuantity.toString(),
              aggregateQuantity: aggregateRow?.quantity.toString() ?? '0',
              rawEventCount: rawCount.toString(),
              aggregateEventCount: aggregateRow?.eventCount.toString() ?? '0',
              matches: aggregateRow !== undefined
                && rawQuantity.equals(aggregateRow.quantity)
                && rawCount === aggregateRow.eventCount,
            };
          })
        : [];
      return {
        raw: { quantity: raw._sum.quantity?.toString() ?? '0', eventCount: raw._count._all },
        daily: aggregates.map((row) => ({ ...row, quantity: row.quantity.toString(), eventCount: row.eventCount.toString() })),
        rawToAggregateReconciliation: {
          checked: wholeUtcDays,
          matches: wholeUtcDays && aggregateReconciliation.every((row) => row.matches),
          days: aggregateReconciliation,
        },
        invoiceAndLedgerReconciliation: 'not_available_until_invoice_and_ledger_modules_are_implemented',
      };
    });
  }

  private async findTenantReplay(tenantId: string, eventId: string, idempotencyKey: string) {
    return this.prisma.client.$transaction(async (tx) => {
      await setTenantContext(tx, tenantId);
      return tx.usageEvent.findFirst({
        where: { OR: [{ eventId }, { tenantId, idempotencyKey }] },
      });
    });
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }

  private isSerializationFailure(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034';
  }
}
