import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../src/database/generated/client.js';
import { setTenantContext } from '../src/database/tenant-context.js';
import { utcBucket } from '../src/modules/usage-metering/usage-metering.util.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

try {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'brightloop-ai-demo' },
    create: { name: 'Brightloop AI Demo', slug: 'brightloop-ai-demo', timezone: 'Asia/Kolkata', currency: 'INR' },
    update: {},
  });

  const seeded = await prisma.$transaction(async (tx) => {
    await setTenantContext(tx, tenant.id);
    const customer = await tx.customer.findFirst({ where: { tenantId: tenant.id, email: 'demo@example.com' } })
      ?? await tx.customer.create({ data: { tenantId: tenant.id, name: 'AI Demo Customer', email: 'demo@example.com' } });
    const subscription = await tx.subscription.findFirst({ where: { tenantId: tenant.id, customerId: customer.id } })
      ?? await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          status: 'ACTIVE',
          billingPeriodStart: new Date('2026-10-01T00:00:00.000Z'),
          billingPeriodEnd: new Date('2026-11-01T00:00:00.000Z'),
        },
      });
    const specs = [
      { code: 'ai_input_tokens', name: 'AI input tokens', unit: 'token', price: 0n },
      { code: 'ai_output_tokens', name: 'AI output tokens', unit: 'token', price: 0n },
      { code: 'model_calls', name: 'Model calls', unit: 'call', price: 0n },
      { code: 'gpu_seconds', name: 'GPU seconds', unit: 'second', price: 0n },
      { code: 'storage_gb', name: 'Storage', unit: 'GB', price: 0n },
      { code: 'api_requests', name: 'API requests', unit: 'request', price: 0n },
    ];
    const meters = [];
    for (const spec of specs) {
      meters.push(await tx.usageMeter.upsert({
        where: { tenantId_code: { tenantId: tenant.id, code: spec.code } },
        create: {
          tenantId: tenant.id,
          code: spec.code,
          name: spec.name,
          unit: spec.unit,
          pricingModel: 'VOLUME',
          unitPriceMinor: spec.price,
          currency: 'INR',
        },
        update: {},
      }));
    }
    return { customer, subscription, meters };
  });

  const occurredAt = new Date();
  const usageSamples = [
    { meter: seeded.meters[0]!, quantity: '1200.00000000', suffix: 'input' },
    { meter: seeded.meters[1]!, quantity: '420.00000000', suffix: 'output' },
    { meter: seeded.meters[2]!, quantity: '12', suffix: 'calls' },
    { meter: seeded.meters[5]!, quantity: '980', suffix: 'requests' },
  ];
  await prisma.$transaction(async (tx) => {
    await setTenantContext(tx, tenant.id);
    for (const sample of usageSamples) {
      const eventId = `demo-${sample.suffix}-2026-10`;
      if (await tx.usageEvent.findUnique({ where: { eventId } })) continue;
      const quantity = new Prisma.Decimal(sample.quantity);
      const event = await tx.usageEvent.create({
        data: {
          eventId,
          tenantId: tenant.id,
          customerId: seeded.customer.id,
          subscriptionId: seeded.subscription.id,
          meterId: sample.meter.id,
          idempotencyKey: `seed-${eventId}`,
          quantity,
          occurredAt,
          source: 'seed-demo',
          metadata: { demo: true },
        },
      });
      for (const grain of ['HOURLY', 'DAILY'] as const) {
        const { start, end } = utcBucket(event.occurredAt, grain);
        await tx.usageAggregate.upsert({
          where: {
            tenantId_meterId_subscriptionId_grain_periodStart: {
              tenantId: tenant.id, meterId: sample.meter.id,
              subscriptionId: seeded.subscription.id, grain, periodStart: start,
            },
          },
          create: {
            tenantId: tenant.id, meterId: sample.meter.id,
            subscriptionId: seeded.subscription.id, grain, periodStart: start, periodEnd: end,
            quantity, eventCount: BigInt(1),
          },
          update: { quantity: { increment: quantity }, eventCount: { increment: BigInt(1) } },
        });
      }
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  const meterSummary = seeded.meters.map((meter) => `  ${meter.code}: ${meter.id}`).join('\n');
  process.stdout.write(`Demo tenant: ${tenant.id}\nCustomer: ${seeded.customer.id}\nSubscription: ${seeded.subscription.id}\nMeters:\n${meterSummary}\nSeeded usage events: ${usageSamples.length}\n`);
} finally {
  await prisma.$disconnect();
}
