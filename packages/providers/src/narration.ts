import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { promisify } from 'node:util';
import type { VoiceProfile } from '@collegenotes/domain';

const execFileAsync = promisify(execFile);
const SAY = '/usr/bin/say';
const DEFAULT_SAMPLE = 'LEF32@22050';

export type NarrationExec = (file: string, args: string[], opts?: { timeout?: number }) => Promise<{ stdout: string; stderr: string }>;
export type SynthesizeRequest = { text: string; voiceId: string; outPath: string; rate?: number };
export type SynthesizeResult = {
  outPath: string;
  byteLength: number;
  durationMs: number;
  startupMs: number;
  throughputCharsPerSec: number;
  voiceId: string;
  textHash: string;
  settingsHash: string;
  providerId: 'local';
  costUsd: 0;
  downloadedBytes: 0;
};

function defaultExec(file: string, args: string[], opts?: { timeout?: number }) {
  return execFileAsync(file, args, { timeout: opts?.timeout ?? 120_000, maxBuffer: 2 * 1024 * 1024 });
}

export function narrationSettingsHash(voiceId: string, rate = 200): string {
  return createHash('sha256').update(JSON.stringify({ voiceId, rate, format: DEFAULT_SAMPLE, providerId: 'local' })).digest('hex').slice(0, 32);
}

export function narrationTextHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function parseSayVoiceList(stdout: string): VoiceProfile[] {
  const voices: VoiceProfile[] = [];
  const seen = new Set<string>();
  for (const line of stdout.split('\n')) {
    const match = line.match(/^(.+?)\s+([a-z]{2}(?:_[A-Z]{2})?)\s+#/);
    if (!match) continue;
    const name = match[1]!.trim();
    const locale = match[2]!;
    const short = name.replace(/\s*\([^)]*\)\s*$/, '').trim() || name;
    const id = short;
    if (seen.has(id)) continue;
    seen.add(id);
    voices.push({
      id,
      name: short,
      language: locale.split('_')[0] ?? locale,
      locale,
      quality: /premium|enhanced/i.test(line) ? 'enhanced' : 'compact',
      providerId: 'local'
    });
  }
  return voices;
}

export async function listVoices(exec: NarrationExec = defaultExec): Promise<VoiceProfile[]> {
  const { stdout } = await exec(SAY, ['-v', '?']);
  const voices = parseSayVoiceList(stdout);
  if (!voices.length) throw new Error('narration_voices_unavailable');
  return voices;
}

function wavDurationMs(buf: Buffer): number {
  if (buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF') return Math.max(1, Math.round((buf.length / 4 / 22050) * 1000));
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === 'fmt ' && offset + 24 <= buf.length) {
      const channels = buf.readUInt16LE(offset + 10);
      const rate = buf.readUInt32LE(offset + 12);
      const bits = buf.readUInt16LE(offset + 22);
      const dataOffset = (() => {
        let at = 12;
        while (at + 8 <= buf.length) {
          const chunk = buf.toString('ascii', at, at + 4);
          const chunkSize = buf.readUInt32LE(at + 4);
          if (chunk === 'data') return { at: at + 8, size: chunkSize };
          at += 8 + chunkSize + (chunkSize % 2);
        }
        return null;
      })();
      if (dataOffset && rate > 0 && channels > 0 && bits > 0) {
        const bytesPerSec = rate * channels * (bits / 8);
        return Math.max(1, Math.round((dataOffset.size / bytesPerSec) * 1000));
      }
    }
    offset += 8 + size + (size % 2);
  }
  return Math.max(1, Math.round((buf.length / 4 / 22050) * 1000));
}

export async function synthesize(request: SynthesizeRequest, exec: NarrationExec = defaultExec): Promise<SynthesizeResult> {
  const text = request.text.trim();
  if (!text || text.length > 100_000 || text.includes('\0')) throw new Error('invalid_narration_text');
  if (!request.voiceId.trim() || request.voiceId.includes('\0') || request.voiceId.length > 80) throw new Error('invalid_voice');
  if (!request.outPath.endsWith('.wav')) throw new Error('invalid_narration_path');
  const voices = await listVoices(exec);
  if (!voices.some((v) => v.id === request.voiceId || v.name === request.voiceId)) throw new Error('narration_voice_unavailable');
  const rate = Number.isFinite(request.rate) ? Math.min(400, Math.max(90, Math.round(request.rate ?? 200))) : 200;
  const started = Date.now();
  try {
    await exec(SAY, ['-v', request.voiceId, '-r', String(rate), '-o', request.outPath, '--data-format=' + DEFAULT_SAMPLE, text], { timeout: 180_000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/voice|not found|Invalid/i.test(message)) throw new Error('narration_voice_unavailable', { cause: error });
    throw new Error('narration_synthesis_failed', { cause: error });
  }
  const startupMs = Date.now() - started;
  if (!fs.existsSync(request.outPath)) throw new Error('narration_synthesis_failed');
  const buf = fs.readFileSync(request.outPath);
  if (buf.length < 44) throw new Error('narration_synthesis_failed');
  const durationMs = wavDurationMs(buf);
  const chars = text.length;
  return {
    outPath: request.outPath,
    byteLength: buf.length,
    durationMs,
    startupMs,
    throughputCharsPerSec: startupMs > 0 ? Number(((chars / startupMs) * 1000).toFixed(2)) : chars,
    voiceId: request.voiceId,
    textHash: narrationTextHash(text),
    settingsHash: narrationSettingsHash(request.voiceId, rate),
    providerId: 'local',
    costUsd: 0,
    downloadedBytes: 0
  };
}
