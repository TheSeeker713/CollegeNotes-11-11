import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runtimeBin } from './runtime.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env, PATH: `${runtimeBin}${path.delimiter}${process.env.PATH ?? ''}` };
const npm = path.join(runtimeBin, 'npm');

function run(command, args, extra = {}) {
  const result = spawnSync(command, args, { cwd: root, env, encoding: 'utf8', ...extra });
  return result;
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

const results = [];
function record(id, status, exitCode, evidence, synthetic) {
  results.push({
    id,
    status,
    exit_code: exitCode,
    evidence_hash: hash(evidence),
    evidence,
    synthetic
  });
}

const fail = run(npm, ['exec', '--', 'vitest', 'run', 'tests/harness/fail/fail.test.ts', '--reporter=json']);
record('CHK-3.2-01', fail.status === 0 ? 'failed' : 'passed', fail.status === 0 ? 1 : 0, fail.stdout + fail.stderr, false);

const empty = run(npm, ['exec', '--', 'vitest', 'run', 'tests/harness/empty', '--reporter=json', '--passWithNoTests']);
function testCount(stdout) {
  const match = stdout.match(/\{[\s\S]*\}$/);
  try { return JSON.parse(match?.[0] ?? '{}').numTotalTests ?? 0; } catch { return -1; }
}
const emptyCount = testCount(empty.stdout);
const skip = run(npm, ['exec', '--', 'vitest', 'run', 'tests/harness/skip/skip.test.ts', '--reporter=json']);
const skipHasSkip = /skip/i.test(skip.stdout + skip.stderr);
record(
  'CHK-3.2-02',
  emptyCount === 0 && skipHasSkip ? 'passed' : 'failed',
  emptyCount === 0 && skipHasSkip ? 0 : 1,
  `emptyTests=${emptyCount} skipDetected=${skipHasSkip}`,
  false
);

const pass = run(npm, ['exec', '--', 'vitest', 'run', 'tests/harness/pass/pass.test.ts', '--reporter=json']);
record('CHK-3.2-03', pass.status === 0 ? 'passed' : 'failed', pass.status ?? 1, pass.stdout + pass.stderr, false);

const boom = run(path.join(runtimeBin, 'node'), ['-e', 'process.exit(2)']);
record('CHK-3.2-04', boom.status === 2 ? 'passed' : 'failed', boom.status === 2 ? 0 : 1, `exit=${boom.status}`, false);

const evals = run(npm, ['run', 'test:evals', '--silent']);
record('CHK-3.2-05', evals.status === 0 && /synthetic/.test(evals.stdout + fs.readFileSync('tests/evals/synthetic.eval.ts', 'utf8')) ? 'passed' : 'failed', evals.status ?? 1, evals.stdout + evals.stderr, true);

const appearance = run(npm, ['run', 'test:unit', '--silent']);
record('CHK-3.2-T01', appearance.status === 0 ? 'passed' : 'failed', appearance.status ?? 1, appearance.stdout + appearance.stderr, false);

const outDir = path.join(root, '.local', 'verification', 'p3');
fs.mkdirSync(outDir, { recursive: true });
const report = {
  kind: 'phase-3.2-verification-gate',
  command: 'node scripts/verify-step.mjs',
  time: new Date().toISOString(),
  results,
  counts: {
    required: results.length,
    executed: results.length,
    passed: results.filter((r) => r.status === 'passed').length,
    failed: results.filter((r) => r.status !== 'passed').length
  }
};
fs.writeFileSync(path.join(outDir, 'verify-step.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.counts));
if (report.counts.failed) process.exit(1);
