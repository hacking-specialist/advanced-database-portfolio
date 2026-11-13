// Native PostgreSQL binaries, isolated data directory, loopback only, no OS service.
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { randomUUID, randomBytes } from 'node:crypto';
import net from 'node:net';
import path from 'node:path';
import pg from 'pg';
import { root, until } from './lib.mjs';
const exec = promisify(execFile);
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
export async function startPostgres() {
  if (process.platform !== 'win32' || process.arch !== 'x64') {
    throw new Error('The native runner currently targets Windows x64; use the SQL with an installed PostgreSQL server elsewhere.');
  }
  const bin = await import('@embedded-postgres/windows-x64');
  const directory = path.join(root, '.runs', `postgres-${randomUUID()}`);
  await mkdir(directory, { recursive: true });
  const databaseDir = path.join(directory, 'data');
  const passwordFile = path.join(directory, 'init-password.txt');
  const password = randomBytes(24).toString('hex');
  await writeFile(passwordFile, password, { mode: 0o600 });
  try {
    await exec(bin.initdb, ['-D', databaseDir, '-U', 'portfolio', '-A', 'scram-sha-256',
      '--pwfile', passwordFile, '--encoding=UTF8', '--locale=C'], { windowsHide: true, timeout: 60000 });
  } finally { await unlink(passwordFile); }
  const port = await freePort();
  let serverLog = '';
  const processHandle = spawn(bin.postgres, ['-D', databaseDir, '-h', '127.0.0.1', '-p', String(port)],
    { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  processHandle.stdout.on('data', x => { serverLog += x; });
  processHandle.stderr.on('data', x => { serverLog += x; });
  let spawnError;
  processHandle.on('error', error => { spawnError = error; });
  const config = { host: '127.0.0.1', port, user: 'portfolio', password, database: 'postgres', connectionTimeoutMillis: 1500 };
  async function connect(applicationName = 'portfolio') {
    const client = new pg.Client({ ...config, application_name: applicationName });
    client.on('error', () => {});
    await client.connect();
    await client.query("SET statement_timeout = '30s'");
    return client;
  }
  async function stop() {
    if (processHandle.exitCode === null && !spawnError) {
      await exec(bin.pg_ctl, ['-D', databaseDir, 'stop', '-m', 'fast', '-w', '-t', '30'], { windowsHide: true, timeout: 35000 });
    }
    await writeFile(path.join(directory, 'server.log'), serverLog);
  }
  let lastConnectionError;
  try {
    await until(async () => {
      if (spawnError) throw spawnError;
      if (processHandle.exitCode !== null) throw new Error(`PostgreSQL exited: ${serverLog}`);
      let c;
      try { c = await connect('readiness'); return true; } catch (error) { lastConnectionError = error; return false; }
      finally { if (c) await c.end(); }
    }, 'native PostgreSQL startup', 60000);
  } catch (error) { await stop(); throw new Error(`${error.message}; last connection error: ${lastConnectionError?.message}`, {cause:error}); }
  return { connect, stop, port };
}
