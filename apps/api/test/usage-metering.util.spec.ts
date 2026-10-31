import assert from 'node:assert/strict';
import test from 'node:test';
import { sameUsagePayload, utcBucket } from '../src/modules/usage-metering/usage-metering.util.js';

test('UTC usage buckets are stable across timezone offsets and month boundaries', () => {
  const eventAt = new Date('2026-03-01T00:15:30.000Z');
  assert.deepEqual(utcBucket(eventAt, 'HOURLY'), {
    start: new Date('2026-03-01T00:00:00.000Z'),
    end: new Date('2026-03-01T01:00:00.000Z'),
  });
  assert.deepEqual(utcBucket(eventAt, 'DAILY'), {
    start: new Date('2026-03-01T00:00:00.000Z'),
    end: new Date('2026-03-02T00:00:00.000Z'),
  });
});

test('usage replay comparison is tenant scoped and ignores metadata key ordering', () => {
  const stored = {
    tenantId: 'tenant-a', customerId: 'customer-a', subscriptionId: 'sub-a', meterId: 'meter-a',
    idempotencyKey: 'idem-1', quantity: { toString: () => '1.25' },
    occurredAt: new Date('2026-01-01T00:00:00.000Z'), source: 'api',
    metadata: { model: 'm1', detail: { input: 10, output: 5 } },
  };
  const incoming = {
    tenantId: 'tenant-a', customerId: 'customer-a', subscriptionId: 'sub-a', meterId: 'meter-a',
    idempotencyKey: 'idem-1', quantity: '1.25',
    timestamp: new Date('2026-01-01T00:00:00.000Z'), source: 'api',
    metadata: { detail: { output: 5, input: 10 }, model: 'm1' },
  };
  assert.equal(sameUsagePayload(stored, incoming), true);
  assert.equal(sameUsagePayload(stored, { ...incoming, tenantId: 'tenant-b' }), false);
  assert.equal(sameUsagePayload(stored, { ...incoming, quantity: '1.5' }), false);
});
