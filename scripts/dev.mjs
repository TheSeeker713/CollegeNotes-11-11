import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runtimeBin } from './runtime.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runDir = path.join(root, '.local', 'run');
fs.mkdirSync(runDir, { recursive: true });
const env = { ...process.env, PATH: `${runtimeBin}${path.delimiter}${process.env.PATH ?? ''}` };
const port = process.env.COLLEGENOTES_PORT ?? '4781';

function start(name, command, args, extra = {}) {
  const child = spawn(command, args, { cwd: root, env: { ...env, ...extra }, stdio: 'inherit' });
  fs.writeFileSync(path.join(runDir, `${name}.pid`), String(child.pid));
  child.on('exit', (code) => {
    if (code && code !== 0) process.exitCode = code;
  });
  return child;
}

const service = start('service', path.join(runtimeBin, 'node'), ['apps/local-service/dist/index.js'], { COLLEGENOTES_PORT: port });
const web = start('web', path.join(runtimeBin, 'npx'), ['vite', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], { npm_config_yes: 'true' });

function shutdown(signal) {
  for (const child of [service, web]) {
    try { child.kill(signal); } catch { /* already exited */ }
  }
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
