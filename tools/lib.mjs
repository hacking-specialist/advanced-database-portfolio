import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
export { assert };
export const root = fileURLToPath(new URL('../', import.meta.url));
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function save(relative, value) {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
}
export const read = relative => readFile(path.join(root, relative), 'utf8');
export async function until(fn, description, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const result = await fn();
    if (result) return result;
    await sleep(100);
  }
  throw new Error(`Timed out: ${description}`);
}
export async function loadLibrary(client) {
  for (const file of ['01_schema.sql', '02_operations.sql', '03_seed_data.sql']) {
    await client.query(await read(`portfolio-1-database-design/sql/${file}`));
  }
}
