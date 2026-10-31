import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceEnvPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../.env');
config({ path: workspaceEnvPath });
