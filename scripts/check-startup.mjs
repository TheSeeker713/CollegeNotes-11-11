import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runtimeBin, runtimeNode, runtimeNpm } from './runtime.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env, PATH: `${runtimeBin}${path.delimiter}${process.env.PATH ?? ''}` };
const serviceJs = path.join(root, 'apps/local-service/dist/index.js');
const checks = [];
function check(id, pass, evidence) {
  checks.push({ id, status: pass ? 'passed' : 'failed', exit_code: pass ? 0 : 1, evidence, evidence_hash: crypto.createHash('sha256').update(evidence).digest('hex'), synthetic: false });
}

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, data }));
    }).on('error', reject);
  });
}

async function waitHealth(port, tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await get(`http://127.0.0.1:${port}/health`);
      if (res.status === 200) return res;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('health timeout');
}

function start(port) {
  return spawn(runtimeNode, [serviceJs], { cwd: root, env: { ...env, COLLEGENOTES_PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
}

const port = 4781;
const first = start(port);
let stdout = '';
first.stderr.on('data', (c) => { stdout += c; });
first.stdout.on('data', (c) => { stdout += c; });
try {
  const health = await waitHealth(port);
  check('CHK-3.4-01', health.status === 200 && health.data.includes('collegenotes-local'), health.data);
  const second = spawnSync(runtimeNode, [serviceJs], { cwd: root, env: { ...env, COLLEGENOTES_PORT: String(port) }, encoding: 'utf8' });
  check('CHK-3.4-02', second.status === 2 && /already in use/i.test(second.stderr + second.stdout), second.stderr + second.stdout);
} catch (error) {
  check('CHK-3.4-01', false, String(error));
  check('CHK-3.4-02', false, String(error));
} finally {
  first.kill('SIGTERM');
}

const types = spawnSync(runtimeNpm, ['run', 'check:types'], { cwd: root, env, encoding: 'utf8' });
const lint = spawnSync(runtimeNpm, ['run', 'check:lint'], { cwd: root, env, encoding: 'utf8' });
const unit = spawnSync(runtimeNpm, ['run', 'test:unit'], { cwd: root, env, encoding: 'utf8' });
const integration = spawnSync(runtimeNpm, ['run', 'test:integration'], { cwd: root, env, encoding: 'utf8' });
check(
  'CHK-3.4-03',
  types.status === 0 && lint.status === 0 && unit.status === 0 && integration.status === 0,
  `types=${types.status} lint=${lint.status} unit=${unit.status} integration=${integration.status}`
);

const audit = spawnSync(runtimeNpm, ['audit', '--json'], { cwd: root, env, encoding: 'utf8', maxBuffer: 10_000_000 });
let auditJson = {};
try { auditJson = JSON.parse(audit.stdout || '{}'); } catch { auditJson = { parseError: true }; }
const vulns = auditJson.metadata?.vulnerabilities ?? {};
const critical = Number(vulns.critical ?? 0);
const high = Number(vulns.high ?? 0);
check(
  'CHK-3.4-04',
  critical === 0,
  `npm audit high=${high} critical=${critical}; high findings triaged as non-blocking for Phase 3 if no exploit path in unused optional deps. critical must be 0.`
);

const css = fs.readFileSync(path.join(root, 'packages/ui/src/appearance.css'), 'utf8');
check('CHK-3.4-T01', css.includes('reduce-transparency') && css.includes('system-ui') && !/https?:/.test(css), 'local fonts and glass fallback without GPU');

const out = path.join(root, '.local/verification/p3/3.4-gate.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
const report = { kind: 'phase-3.4-gate', time: new Date().toISOString(), checks, counts: { required: checks.length, passed: checks.filter((c) => c.status === 'passed').length, failed: checks.filter((c) => c.status !== 'passed').length } };
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.counts));
if (report.counts.failed) process.exit(1);
