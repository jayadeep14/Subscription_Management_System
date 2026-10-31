import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function findWorkspaceRoot(start: string): string | undefined {
  let current = start;
  while (true) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

const workspaceRoot = findWorkspaceRoot(dirname(fileURLToPath(import.meta.url)))
  ?? findWorkspaceRoot(process.cwd());
if (workspaceRoot) config({ path: join(workspaceRoot, '.env') });
