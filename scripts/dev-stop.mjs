import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.local', 'run');
if (!fs.existsSync(runDir)) process.exit(0);
for (const file of fs.readdirSync(runDir).filter((name) => name.endsWith('.pid'))) {
  const pid = Number(fs.readFileSync(path.join(runDir, file), 'utf8'));
  if (Number.isInteger(pid) && pid > 1) {
    try { process.kill(pid, 'SIGTERM'); } catch { /* gone */ }
  }
  fs.unlinkSync(path.join(runDir, file));
}
console.log('Stopped CollegeNotes development processes.');
