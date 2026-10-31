export type AggregationGrain = 'HOURLY' | 'DAILY';

export function utcBucket(date: Date, grain: AggregationGrain): { start: Date; end: Date } {
  const start = new Date(date);
  start.setUTCMinutes(0, 0, 0);
  if (grain === 'DAILY') start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  if (grain === 'HOURLY') end.setUTCHours(end.getUTCHours() + 1);
  else end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function sameUsagePayload(
  stored: { tenantId: string; customerId: string; subscriptionId: string; meterId: string; idempotencyKey: string; quantity: { toString(): string }; occurredAt: Date; source: string; metadata: unknown },
  incoming: { tenantId: string; customerId: string; subscriptionId: string; meterId: string; idempotencyKey: string; quantity: string; timestamp: Date; source: string; metadata?: unknown },
): boolean {
  return stored.tenantId === incoming.tenantId
    && stored.customerId === incoming.customerId
    && stored.subscriptionId === incoming.subscriptionId
    && stored.meterId === incoming.meterId
    && stored.idempotencyKey === incoming.idempotencyKey
    && stored.quantity.toString() === incoming.quantity
    && stored.occurredAt.getTime() === incoming.timestamp.getTime()
    && stored.source === incoming.source
    && canonicalJson(stored.metadata) === canonicalJson(incoming.metadata ?? null);
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
