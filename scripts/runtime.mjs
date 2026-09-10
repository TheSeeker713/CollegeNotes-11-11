import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const runtimeBin = path.join(root, '.local', 'runtime', 'node', 'bin');
export const runtimeNode = path.join(runtimeBin, 'node');
export const runtimeNpm = path.join(runtimeBin, 'npm');
