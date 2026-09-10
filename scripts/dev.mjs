import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runtimeBin } from './runtime.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runDir = path.join(root, '.local', 'run');
fs.mkdirSync(runDir, { recursive: true });
const env = { ...process.env, PATH: `${runtimeBin}${path.delimiter}${process.env.PATH ?? ''}` };
const children = [];
const port = process.env.COLLEGENOTES_PORT ?? '4781';
if (port !== '4781') throw new Error('The current browser client requires local service port 4781. Stop the conflicting service before starting this build.');

function start(name, command, args, extra = {}) {
  const child = spawn(command, args, { cwd: root, env: { ...env, ...extra }, stdio: 'inherit' });
  children.push(child);
  const pidFile = path.join(runDir, `${name}.pid`);
  fs.writeFileSync(pidFile, String(child.pid));
  child.on('exit', (code) => {
    if (fs.existsSync(pidFile) && fs.readFileSync(pidFile, 'utf8') === String(child.pid)) fs.unlinkSync(pidFile);
    if (code && code !== 0) { process.exitCode = code; shutdown('SIGTERM'); }
  });
  return child;
}

start('service', path.join(runtimeBin, 'node'), ['apps/local-service/dist/index.js'], { COLLEGENOTES_PORT: port });
start('web', path.join(runtimeBin, 'node'), ['node_modules/vite/bin/vite.js', 'apps/web', '--config', 'apps/web/vite.config.ts', '--host', '127.0.0.1', '--port', '5173', '--strictPort']);

function shutdown(signal) {
  for (const child of children) {
    try { child.kill(signal); } catch { /* already exited */ }
  }
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
