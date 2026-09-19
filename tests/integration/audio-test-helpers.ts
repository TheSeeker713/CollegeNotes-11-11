import fs from 'node:fs';
import type { NarrationExec } from '@collegenotes/providers';

/** Minimal mono float32 WAV @ 22050 Hz for offline tests without invoking /usr/bin/say. */
export function writeSyntheticWav(outPath: string, durationMs = 1000): void {
  const rate = 22050;
  const frames = Math.max(1, Math.round((durationMs / 1000) * rate));
  const dataSize = frames * 4;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(3, 20); // IEEE float
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(32, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  fs.writeFileSync(outPath, buf);
}

export function syntheticSayExec(durationMs = 1200): NarrationExec {
  return async (_file, args) => {
    if (args[0] === '-v' && args[1] === '?') {
      return { stdout: 'Samantha            en_US    # Hello! My name is Samantha.\nAlex                 en_US    # Hello! My name is Alex.\n', stderr: '' };
    }
    const outIdx = args.indexOf('-o');
    const outPath = outIdx >= 0 ? args[outIdx + 1] : undefined;
    const voice = args[1];
    if (voice === 'DefinitelyNotARealVoice_XYZ') throw new Error('Invalid voice');
    if (!outPath) throw new Error('missing out');
    writeSyntheticWav(outPath, durationMs);
    return { stdout: '', stderr: '' };
  };
}
