import { Prisma } from './generated/client.js';

export async function setTenantContext(transaction: Prisma.TransactionClient, tenantId: string): Promise<void> {
  await transaction.$queryRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
}
