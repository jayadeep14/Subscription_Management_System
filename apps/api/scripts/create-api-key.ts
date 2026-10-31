import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/database/generated/client.js';
import { createHash, randomBytes } from 'node:crypto';

const [tenantId, name = 'Usage ingestion key'] = process.argv.slice(2);
if (!tenantId) {
  process.stderr.write('Usage: pnpm --filter @brightloop/api api-key:create <tenant-uuid> [name]\n');
  process.exit(2);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

try {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant || tenant.status !== 'ACTIVE') throw new Error('An active tenant with that ID was not found');
  const rawKey = `bl_live_${randomBytes(32).toString('base64url')}`;
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const apiKey = await prisma.tenantApiKey.create({
    data: { tenantId, name, keyHash, scopes: ['usage:write', 'usage:read'] },
  });
  process.stdout.write(`Created API key ${apiKey.id}. Copy this key now; it cannot be retrieved again:\n${rawKey}\n`);
} finally {
  await prisma.$disconnect();
}
