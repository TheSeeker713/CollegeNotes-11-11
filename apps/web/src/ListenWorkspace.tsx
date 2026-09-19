import { useEffect, useRef, useState } from 'react';
import type { NarrationAsset, NarrationPlaybackState, RecognitionTranscript, VoiceInterruptSession, VoiceProfile } from '@collegenotes/domain';
import { api, type MaterialSummary } from './client';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function ListenWorkspace({ courseId }: { courseId: string }) {
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [materials, setMaterials] = useState<MaterialSummary[]>([]);
  const [assets, setAssets] = useState<NarrationAsset[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [asset, setAsset] = useState<NarrationAsset | null>(null);
  const [playback, setPlayback] = useState<NarrationPlaybackState | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [micPermission, setMicPermission] = useState('unknown');
  const [capturing, setCapturing] = useState(false);
  const [transcript, setTranscript] = useState<RecognitionTranscript | null>(null);
  const [termFrom, setTermFrom] = useState('');
  const [termTo, setTermTo] = useState('');
  const [interrupt, setInterrupt] = useState<VoiceInterruptSession | null>(null);
  const [echoBlocked, setEchoBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generationCount = useRef(0);

  async function refresh() {
    const [v, m, a] = await Promise.all([api.audio.voices(), api.materials.list(courseId), api.audio.list(courseId)]);
    setVoices(v);
    setMaterials(m.filter((row) => row.approvedRevision === row.revision && !row.trashedAt && !row.deletedAt));
    setAssets(a);
    if (!voiceId && v[0]) setVoiceId(v[0].id);
  }

  useEffect(() => {
    let active = true;
    void refresh().catch((e) => { if (active) setNotice(e instanceof Error ? e.message : 'Audio unavailable.'); });
    return () => { active = false; };
  }, [courseId]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !playback) return;
    el.playbackRate = playback.speed;
    if (Math.abs(el.currentTime * 1000 - playback.offsetMs) > 250) el.currentTime = playback.offsetMs / 1000;
  }, [playback?.offsetMs, playback?.speed, asset?.id]);

  async function generate() {
    setBusy(true);
    try {
      generationCount.current += 1;
      const created = await api.audio.generate(courseId, { sourceId, voiceId });
      setAsset(created);
      setAssets(await api.audio.list(courseId, sourceId));
      const state = await api.audio.playback(courseId, created.id);
      setPlayback(state);
      setNotice(created.reused ? 'Playing saved narration. No new generation request.' : `Generated locally in ${created.timing.startupMs} ms · ${created.timing.throughputCharsPerSec} chars/s · $0 download.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Narration failed.');
    } finally {
      setBusy(false);
    }
  }

  async function selectAsset(id: string) {
    const next = await api.audio.get(courseId, id);
    setAsset(next);
    setPlayback(await api.audio.playback(courseId, id));
    setNotice('Loaded cached narration.');
  }

  async function persistPlayback(next: Partial<NarrationPlaybackState>) {
    if (!asset || !playback) return;
    const saved = await api.audio.savePlayback(courseId, asset.id, {
      offsetMs: next.offsetMs ?? playback.offsetMs,
      speed: next.speed ?? playback.speed,
      bookmarks: next.bookmarks ?? playback.bookmarks
    });
    setPlayback(saved);
  }

  function onTimeUpdate() {
    const el = audioRef.current;
    if (!el || !asset || !playing) return;
    const offsetMs = Math.round(el.currentTime * 1000);
    void persistPlayback({ offsetMs }).catch(() => undefined);
  }

  async function startMic() {
    setCapturing(true);
    try {
      const devices = await navigator.mediaDevices?.enumerateDevices?.() ?? [];
      const hasMic = devices.some((d) => d.kind === 'audioinput');
      if (!hasMic) {
        setMicPermission('missing_device');
        setCapturing(false);
        setNotice('No microphone device is available.');
        return;
      }
      if (micPermission === 'denied' || micPermission === 'revoked') {
        setCapturing(false);
        setNotice('Microphone permission was denied. Enable it in System Settings, then try again. No repeated prompts.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicPermission('granted');
      const created = await api.audio.recognize(courseId, { expectedText: 'Synthetic teach-back about the approved source.', terms: termFrom && termTo ? [{ from: termFrom, to: termTo }] : [] });
      setTranscript(created);
      setNotice('Capture released after stop. Transcript is editable.');
    } catch {
      setMicPermission('denied');
      setNotice('Microphone permission denied.');
    } finally {
      setCapturing(false);
    }
  }

  async function askWhileListening() {
    if (!asset || !playback) return;
    setBusy(true);
    try {
      const session = await api.audio.interrupt(courseId, { assetId: asset.id, offsetMs: playback.offsetMs, clientRequestId: `ask-${asset.id}-${playback.offsetMs}` });
      setInterrupt(session);
      audioRef.current?.pause();
      setPlaying(false);
      const asked = await api.audio.advanceInterrupt(courseId, session.id, { action: 'ask', tutorRequestId: `local-${Date.now()}`, networkAvailable: true });
      setInterrupt(asked);
      const echo = await api.audio.echo(courseId, asked.id);
      setEchoBlocked(echo.suppressed);
      setNotice('Narration paused for a tutor question. Echo suppression is on while tutor audio would play.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Interrupt failed.');
    } finally {
      setBusy(false);
    }
  }

  async function resumeAfterAsk() {
    if (!interrupt) return;
    const resumed = await api.audio.advanceInterrupt(courseId, interrupt.id, { action: 'resume' });
    setInterrupt(resumed);
    setPlayback(await api.audio.playback(courseId, resumed.assetId));
    setEchoBlocked(false);
    setNotice(`Resumed at ${resumed.savedOffsetMs} ms.`);
  }

  const activeSentence = asset && playback
    ? asset.anchors.find((a) => playback.offsetMs >= a.startMs && playback.offsetMs < a.endMs) ?? asset.anchors.at(-1)
    : null;

  return (
    <section className="glass glass-card">
      <h1>Listen</h1>
      <p>Generate narration with macOS Say on this Mac. Audio is cached locally. No model downloads.</p>
      <p role="status">{notice}</p>
      <form className="form-stack" onSubmit={(e) => { e.preventDefault(); void generate(); }}>
        <label>Approved source
          <select required value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            <option value="">Choose a source</option>
            {materials.map((m) => <option key={m.id} value={m.id}>{m.filename}</option>)}
          </select>
        </label>
        <label>Voice
          <select required value={voiceId} onChange={(e) => setVoiceId(e.target.value)}>
            {voices.map((v) => <option key={v.id} value={v.id}>{v.name} · {v.locale ?? v.language}</option>)}
          </select>
        </label>
        <button disabled={busy || !sourceId || !voiceId}>{busy ? 'Working…' : 'Generate or reuse narration'}</button>
      </form>
      {assets.length > 0 && (
        <div>
          <h2>Saved narrations</h2>
          {assets.map((a) => (
            <p key={a.id}>
              {a.voiceId} · rev {a.sourceRevision} · {a.status} · {(a.durationMs / 1000).toFixed(1)}s
              <button type="button" disabled={busy} onClick={() => void selectAsset(a.id)}>Open</button>
            </p>
          ))}
        </div>
      )}
      {asset && playback && (
        <div className="form-stack">
          <h2>Playback</h2>
          <audio
            ref={audioRef}
            controls
            src={api.audio.fileUrl(courseId, asset.id)}
            onPlay={() => setPlaying(true)}
            onPause={() => { setPlaying(false); void persistPlayback({ offsetMs: Math.round((audioRef.current?.currentTime ?? 0) * 1000) }); }}
            onTimeUpdate={onTimeUpdate}
          />
          <p>Sentence: {activeSentence?.text ?? '—'}</p>
          <label>Speed
            <select value={playback.speed} onChange={(e) => void persistPlayback({ speed: Number(e.target.value) })}>
              {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
            </select>
          </label>
          <button type="button" disabled={busy} onClick={() => void persistPlayback({ offsetMs: activeSentence?.startMs ?? 0 })}>Restart sentence</button>
          <button type="button" disabled={busy} onClick={() => void askWhileListening()}>Ask a question (interrupt)</button>
          {interrupt?.status === 'asking' || interrupt?.status === 'interrupted' ? (
            <button type="button" disabled={busy} onClick={() => void resumeAfterAsk()}>Resume narration</button>
          ) : null}
          <p>Echo suppressed while tutor audio: {echoBlocked ? 'yes' : 'no'}</p>
        </div>
      )}
      <div className="form-stack">
        <h2>Microphone and recognition</h2>
        <p>Permission: {micPermission} · Capture: {capturing ? 'capturing' : 'idle'}</p>
        <label>Technical term (from)<input value={termFrom} onChange={(e) => setTermFrom(e.target.value)} /></label>
        <label>Corrected term (to)<input value={termTo} onChange={(e) => setTermTo(e.target.value)} /></label>
        <button type="button" disabled={capturing} onClick={() => void startMic()}>{capturing ? 'Listening…' : 'Start then stop capture'}</button>
        {transcript && (
          <>
            <label>Editable transcript
              <textarea value={transcript.editedText} onChange={(e) => setTranscript({ ...transcript, editedText: e.target.value })} />
            </label>
            <button type="button" onClick={() => void api.audio.updateRecognition(courseId, transcript.id, {
              editedText: transcript.editedText,
              terms: termFrom && termTo ? [...transcript.terms, { from: termFrom, to: termTo }] : transcript.terms,
              status: 'final'
            }).then(setTranscript).then(() => setNotice('Transcript saved.'))}>Save transcript</button>
          </>
        )}
      </div>
    </section>
  );
}
