import { PGlite } from '@electric-sql/pglite';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const evidence = path.join(root, 'portfolio-1-database-design/evidence');
const log = ['Embedded PostgreSQL validation — not a standalone server or concurrency benchmark.',
  `Executed at: ${new Date().toISOString()}`, 'Runtime: @electric-sql/pglite 0.5.16'];
const db = new PGlite({ onNotice: notice => log.push(`NOTICE: ${notice.message}`) });
let success = false;
try {
  log.push(JSON.stringify((await db.query('SELECT version()')).rows));
  for (const file of ['01_schema.sql', '02_operations.sql', '03_seed_data.sql', '04_example_queries.sql', '05_validation.sql']) {
    const sql = await readFile(path.join(root, 'portfolio-1-database-design/sql', file), 'utf8');
    const results = await db.exec(sql);
    log.push(`PASS: ${file}`);
    if (file === '04_example_queries.sql') log.push(JSON.stringify(results.map(r => r.rows), null, 2));
  }
  const tables = ['books', 'book_copies', 'borrowers', 'staff', 'loans', 'returns', 'fines'];
  const expected = [5, 10, 4, 3, 4, 2, 2];
  for (let i = 0; i < tables.length; i++) {
    const { rows } = await db.query(`SELECT count(*)::integer AS n FROM library.${tables[i]}`);
    if (rows[0].n !== expected[i]) throw new Error(`Unexpected count for ${tables[i]}`);
    log.push(`PASS: ${tables[i]} = ${rows[0].n}`);
  }
  success = true;
  log.push('PASS: all validation completed. No multi-session or server performance claims.');
} catch (error) {
  log.push(`FAIL: ${error.stack || error.message}`);
  process.exitCode = 1;
} finally {
  await db.close();
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, 'embedded-validation.txt'), log.join('\n') + '\n');
  console.log(log.join('\n'));
}
if (!success) process.exitCode = 1;
