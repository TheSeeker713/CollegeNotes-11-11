import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runtimeBin, runtimeNode, runtimeNpm } from './runtime.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env, PATH: `${runtimeBin}${path.delimiter}${process.env.PATH ?? ''}` };
const checks = [];
function check(id, pass, evidence) {
  checks.push({ id, status: pass ? 'passed' : 'failed', exit_code: pass ? 0 : 1, evidence, evidence_hash: crypto.createHash('sha256').update(evidence).digest('hex'), synthetic: false });
}

const nodeV = spawnSync(runtimeNode, ['-v'], { encoding: 'utf8' }).stdout.trim();
const npmV = spawnSync(runtimeNpm, ['-v'], { encoding: 'utf8' }).stdout.trim();
check('CHK-3.1-02', nodeV === 'v24.21.0' && npmV === '12.0.2', `node=${nodeV} npm=${npmV}`);

const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const pkgs = JSON.parse(fs.readFileSync(path.join(root, 'phase0/installation-manifest.json'), 'utf8')).packages;
const wanted = Object.fromEntries(pkgs.filter((p) => p.name !== 'npm').map((p) => [p.name, p.version]));
const lockPkgs = lock.packages ?? {};
const mismatches = Object.entries(wanted).filter(([name, version]) => {
  const key = Object.keys(lockPkgs).find((k) => k === `node_modules/${name}` || k.endsWith(`/node_modules/${name}`));
  const resolved = key ? lockPkgs[key]?.version : undefined;
  return resolved !== version;
});
check('CHK-3.1-02b', mismatches.length === 0, mismatches.length ? JSON.stringify(mismatches) : 'all pinned packages match lockfile');

const reinstall = spawnSync(runtimeNpm, ['ci', '--ignore-scripts=false'], { cwd: root, env, encoding: 'utf8' });
check('CHK-3.1-01', reinstall.status === 0 && fs.existsSync(path.join(root, 'node_modules')), (reinstall.stdout + reinstall.stderr).slice(-2000));

const unexpected = JSON.stringify(lock).match(/openai|anthropic|stripe|firebase|aws-sdk|@google-cloud/gi) ?? [];
check('CHK-3.1-03', unexpected.length === 0, unexpected.length ? unexpected.join(',') : 'no unexpected cloud SDKs in lockfile');

const stagedSecrets = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).stdout.split('\0').filter((f) => /\.env$|\.pem$|\.key$|credentials/i.test(f) && f !== '.env.example');
check('CHK-3.1-04', stagedSecrets.length === 0 && fs.existsSync(path.join(root, '.env.example')), stagedSecrets.join(',') || '.env.example present; no secrets staged');

const build = spawnSync(runtimeNpm, ['run', 'build'], { cwd: root, env, encoding: 'utf8' });
const webDist = fs.existsSync(path.join(root, 'apps/web/dist/index.html'));
const serviceDist = fs.existsSync(path.join(root, 'apps/local-service/dist/index.js'));
check('CHK-3.1-05', build.status === 0 && webDist && serviceDist, (build.stdout + build.stderr).slice(-2500));

const css = fs.readFileSync(path.join(root, 'packages/ui/src/appearance.css'), 'utf8');
const tokens = fs.readFileSync(path.join(root, 'packages/ui/src/tokens.ts'), 'utf8');
check('CHK-3.1-T01', !/https?:\/\/fonts|cdn\.|typekit/i.test(css + tokens) && /system-ui/.test(tokens), 'local system fonts only');

const out = path.join(root, '.local/verification/p3/3.1-gate.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
const report = { kind: 'phase-3.1-gate', time: new Date().toISOString(), checks, counts: { required: checks.length, passed: checks.filter((c) => c.status === 'passed').length, failed: checks.filter((c) => c.status !== 'passed').length } };
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.counts));
if (report.counts.failed) process.exit(1);
