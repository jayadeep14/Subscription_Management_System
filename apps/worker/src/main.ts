import 'dotenv/config';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  'platform',
  async (job) => {
    throw new Error(`No handler registered for job type "${job.name}"`);
  },
  { connection, concurrency: 5 },
);

worker.on('failed', (job, error) => {
  process.stderr.write(JSON.stringify({ level: 'error', event: 'job.failed', jobId: job?.id, error: error.message }) + '\n');
});

worker.on('ready', () => {
  process.stdout.write(JSON.stringify({ level: 'info', event: 'worker.ready', queue: 'platform' }) + '\n');
});

async function shutdown() {
  await worker.close();
  await connection.quit();
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
