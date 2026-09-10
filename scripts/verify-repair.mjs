import { spawnSync, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runtimeBin, runtimeNpm } from './runtime.mjs';
const phase = process.argv[2];
if (!['3', '4'].includes(phase)) throw new Error('Expected repair phase 3 or 4');
const out = `.local/verification/repair/phase-${phase}`;
if (fs.existsSync(out)) fs.renameSync(out, `${out}-previous-${Date.now()}`);
fs.mkdirSync(out, { recursive: true });
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter((f) => f && fs.existsSync(f));
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const fingerprint = () => Object.fromEntries(files.map((f) => [f, sha(fs.readFileSync(f))]));
const before = fingerprint();
const scripts = ['check:types', 'check:lint', 'build', 'test:unit', 'test:integration', 'test:evals', 'verify:planning', 'test:workflow', 'verify:step'];
const results = scripts.map((script) => {
  const run = spawnSync(runtimeNpm, ['run', script], { env: { ...process.env, PATH: `${runtimeBin}${path.delimiter}${process.env.PATH ?? ''}` }, encoding: 'utf8' });
  const output = (run.stdout ?? '') + (run.stderr ?? '');
  fs.writeFileSync(`${out}/${script.replace(':', '-')}.log`, output);
  const counts = /Tests\s+(\d+) passed \((\d+)\)/.exec(output);
  const casesValid = !script.startsWith('test:') || script === 'test:workflow' || (counts && Number(counts[1]) > 0 && counts[1] === counts[2] && !/\d+ (skipped|failed|todo)/.test(output));
  return { command: `npm run ${script}`, exit: run.status, passed: run.status === 0 && Boolean(casesValid), cases: counts ? Number(counts[1]) : null, evidenceHash: sha(output) };
});
const sourceUnchanged = JSON.stringify(before) === JSON.stringify(fingerprint());
const report = { phase, time: new Date().toISOString(), sourceHashes: before, sourceUnchanged, results,
  ownerOnlyPending: ['desktop rendered design review', 'UI/UX manual tests', 'browser/accessibility checks', 'Phase 5 green light'],
  boundaries: 'No UI/UX tests, live provider calls or model downloads. Synthetic auth/provider tests do not prove real account access.' };
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ phase, sourceUnchanged, results, ownerOnlyPending: report.ownerOnlyPending }, null, 2));
if (!sourceUnchanged || results.some((r) => !r.passed)) process.exit(1);
