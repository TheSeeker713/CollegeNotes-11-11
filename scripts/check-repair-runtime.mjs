import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { runtimeNode } from './runtime.mjs';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cn-runtime-repair-'));
const children = [];
const logs = [];
async function freePort() {
  const server = net.createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port; await new Promise((resolve) => server.close(resolve)); return port;
}
function start(args, env = {}) {
  const child = spawn(runtimeNode, args, { env: { ...process.env, COLLEGENOTES_DATA_DIR: dataDir, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  child.stdout.on('data', (d) => logs.push(d.toString())); child.stderr.on('data', (d) => logs.push(d.toString()));
  return child;
}
const results = [];
async function poll(fn) {
  for (let i = 0; i < 60; i++) { try { if (await fn()) return; } catch { /* startup retry */ } await new Promise((r) => setTimeout(r, 100)); }
  throw new Error('runtime_startup_timeout');
}
try {
  const port = await freePort();
  const service = start(['apps/local-service/dist/index.js'], { COLLEGENOTES_PORT: String(port) });
  await poll(async () => {
    const res = await globalThis.fetch(`http://127.0.0.1:${port}/health`); const body = await res.json();
    return res.ok && body.service === 'collegenotes-local' && body.dataDir === dataDir;
  });
  results.push({ id: 'compiled_service_startup', passed: service.exitCode === null });
  const other = start(['apps/local-service/dist/index.js'], { COLLEGENOTES_PORT: String(port) });
  const [code] = await once(other, 'exit'); results.push({ id: 'occupied_service_port', passed: code === 2 });
  const webPort = await freePort();
  const web = start(['node_modules/vite/bin/vite.js', 'apps/web', '--config', 'apps/web/vite.config.ts', '--host', '127.0.0.1', '--port', String(webPort), '--strictPort']);
  await poll(() => new Promise((resolve) => {
    const socket = net.connect(webPort, '127.0.0.1'); socket.once('connect', () => { socket.destroy(); resolve(true); }); socket.once('error', () => { socket.destroy(); resolve(false); });
  }));
  results.push({ id: 'vite_process_listens', passed: web.exitCode === null });
} finally {
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      const exit = once(child, 'exit'); child.kill('SIGTERM'); await exit;
    }
  }
  fs.rmSync(dataDir, { recursive: true, force: true });
  const out = '.local/verification/repair/runtime'; fs.mkdirSync(out, { recursive: true });
  const stamp = Date.now();
  fs.writeFileSync(`${out}/${stamp}.log`, logs.join(''));
  fs.writeFileSync(`${out}/${stamp}.json`, JSON.stringify({ time: new Date().toISOString(), results, scope: 'Process/service infrastructure only; no browser, UI rendering or UI/UX test. Temporary database removed.' }, null, 2));
}
console.log(JSON.stringify({ required: 3, results }));
if (results.length !== 3 || results.some((r) => !r.passed)) process.exit(1);
