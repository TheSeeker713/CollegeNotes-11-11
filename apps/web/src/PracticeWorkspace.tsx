import { useEffect, useRef, useState } from 'react';
import type {
  FeedbackCategory,
  PracticeAnnotation,
  PracticeChecklistItem,
  PracticeCueCard,
  PracticeHistoryEntry,
  PracticeMedia,
  PracticeObservation,
  PracticeRehearsal,
  PracticeTranscript
} from '@collegenotes/domain';
import { FEEDBACK_CATEGORIES, countWords } from '@collegenotes/domain';
import { api } from './client';

const categoryLabel: Record<FeedbackCategory, string> = {
  praise: 'Praise',
  question: 'Question',
  polish: 'Polish'
};

export function PracticeWorkspace({ courseId }: { courseId: string }) {
  const [notice, setNotice] = useState('');
  const [observations, setObservations] = useState<PracticeObservation[]>([]);
  const [category, setCategory] = useState<FeedbackCategory>('praise');
  const [body, setBody] = useState('');
  const [rationale, setRationale] = useState('');
  const [media, setMedia] = useState<PracticeMedia[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<PracticeMedia | null>(null);
  const [transcript, setTranscript] = useState<PracticeTranscript | null>(null);
  const [annotations, setAnnotations] = useState<PracticeAnnotation[]>([]);
  const [cues, setCues] = useState<PracticeCueCard[]>([]);
  const [cueTitle, setCueTitle] = useState('');
  const [cueNotes, setCueNotes] = useState('');
  const [rehearsal, setRehearsal] = useState<PracticeRehearsal | null>(null);
  const [checklist, setChecklist] = useState<PracticeChecklistItem[]>([]);
  const [checkLabel, setCheckLabel] = useState('');
  const [history, setHistory] = useState<PracticeHistoryEntry[]>([]);
  const [slideContent, setSlideContent] = useState('');
  const [slideResult, setSlideResult] = useState('');
  const [tutorTopic, setTutorTopic] = useState('');
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);

  async function refresh() {
    const [o, m, c, r, ch, h] = await Promise.all([
      api.practice.observations(courseId),
      api.practice.media(courseId),
      api.practice.cues(courseId),
      api.practice.rehearsals(courseId),
      api.practice.checklist(courseId),
      api.practice.history(courseId)
    ]);
    setObservations(o);
    setMedia(m);
    setCues(c);
    setChecklist(ch);
    setHistory(h);
    setRehearsal(r.find((row) => row.status === 'recording') ?? r[r.length - 1] ?? null);
  }

  useEffect(() => {
    let active = true;
    void refresh().catch((e) => { if (active) setNotice(e instanceof Error ? e.message : 'Practice unavailable.'); });
    return () => { active = false; };
  }, [courseId]);

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, []);

  async function submitObservation(status: 'draft' | 'submitted') {
    try {
      await api.practice.createObservation(courseId, { category, body, rationale, status, mediaId: selectedMedia?.id ?? null, timestampMs: transcript?.seekMs ?? null });
      setBody('');
      setRationale('');
      setNotice(status === 'submitted' ? 'Observation saved.' : 'Draft observation saved.');
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not save observation.');
    }
  }

  async function onImportMedia(file: File | null) {
    if (!file) return;
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      for (const byte of buf) binary += String.fromCharCode(byte);
      const created = await api.practice.importMedia(courseId, {
        filename: file.name,
        mimeType: file.type || undefined,
        contentBase64: btoa(binary)
      });
      setSelectedMedia(created);
      setNotice(`Imported ${created.filename} locally.`);
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Unsupported practice media.');
    }
  }

  async function loadTranscript(mediaRow: PracticeMedia) {
    try {
      setSelectedMedia(mediaRow);
      const tr = await api.practice.transcript(courseId, mediaRow.id, {
        segments: [{ index: 0, text: 'Synthetic practice transcript segment.', startMs: 0, endMs: 1000 }],
        rawText: 'Synthetic practice transcript segment.'
      });
      setTranscript(tr);
      setAnnotations(await api.practice.annotations(courseId, mediaRow.id));
      setNotice('Transcript ready for review.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Transcript unavailable.');
    }
  }

  async function saveTranscriptEdit(editedText: string, seekMs: number) {
    if (!transcript) return;
    try {
      const next = await api.practice.updateTranscript(courseId, transcript.id, { editedText, seekMs });
      setTranscript(next);
      setNotice('Transcript correction saved.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not correct transcript.');
    }
  }

  async function addAnnotation() {
    if (!selectedMedia || !transcript) return;
    try {
      await api.practice.createAnnotation(courseId, {
        mediaId: selectedMedia.id,
        offsetMs: transcript.seekMs,
        body: body.trim() || 'Annotation at current seek position.'
      });
      setAnnotations(await api.practice.annotations(courseId, selectedMedia.id));
      setNotice('Annotation attached to timestamp.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not add annotation.');
    }
  }

  async function checkVisualClaim(claim: string) {
    if (!selectedMedia) return;
    try {
      const result = await api.practice.visualClaim(courseId, selectedMedia.id, claim);
      setNotice(result.allowed ? 'Claim accepted for this media kind.' : `Refused: ${result.reason}`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Visual claim check failed.');
    }
  }

  async function addCue() {
    try {
      await api.practice.createCue(courseId, { title: cueTitle, notes: cueNotes });
      setCueTitle('');
      setCueNotes('');
      setNotice('Cue card saved with your exact notes.');
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not save cue card.');
    }
  }

  function clearTimer() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    startedAtRef.current = null;
  }

  async function startRehearsal() {
    try {
      const created = await api.practice.createRehearsal(courseId, { configuredDurationMs: null });
      const started = await api.practice.advanceRehearsal(courseId, created.id, { action: 'start' });
      setRehearsal(started);
      startedAtRef.current = Date.now();
      clearTimer();
      timerRef.current = window.setInterval(() => {
        if (!startedAtRef.current) return;
        const elapsedMs = Date.now() - startedAtRef.current;
        void api.practice.advanceRehearsal(courseId, created.id, { action: 'tick', elapsedMs })
          .then(setRehearsal)
          .catch(() => undefined);
      }, 250);
      setNotice('Recording started. Speech duration stays unconfigured until you supply one.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not start rehearsal.');
    }
  }

  async function stopRehearsal(action: 'stop' | 'cancel') {
    if (!rehearsal) return;
    try {
      const elapsedMs = startedAtRef.current ? Date.now() - startedAtRef.current : rehearsal.elapsedMs;
      clearTimer();
      const next = await api.practice.advanceRehearsal(courseId, rehearsal.id, { action, elapsedMs });
      setRehearsal(next);
      setNotice(action === 'stop' ? 'Recording stopped.' : 'Recording cancelled.');
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not update rehearsal.');
    }
  }

  async function shiftCue(delta: number) {
    if (!rehearsal) return;
    const nextIndex = Math.max(0, rehearsal.cueIndex + delta);
    try {
      setRehearsal(await api.practice.advanceRehearsal(courseId, rehearsal.id, { action: 'set_cue', cueIndex: nextIndex }));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not change cue.');
    }
  }

  async function inspectSlide() {
    try {
      const result = await api.practice.slideInspect(courseId, {
        width: 960,
        height: 540,
        fontSizePx: 18,
        lineCount: slideContent.split('\n').length,
        maxCharsPerLine: Math.max(...slideContent.split('\n').map((l) => l.length), 1),
        content: slideContent
      });
      setSlideResult(result.clipped || result.reflowNeeded
        ? `Needs attention · clipped=${result.clipped} reflow=${result.reflowNeeded}`
        : 'Readable at current size.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Slide inspection failed.');
    }
  }

  async function askTutor() {
    try {
      const result = await api.practice.tutorQuestion(courseId, tutorTopic);
      setNotice(result.allowed ? `Tutor hook ready: ${result.prompt}` : `Tutor unavailable: ${result.reason}`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Tutor hook failed.');
    }
  }

  async function addChecklistItem() {
    try {
      await api.practice.createChecklist(courseId, { label: checkLabel });
      setCheckLabel('');
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not add checklist item.');
    }
  }

  async function exportPractice() {
    try {
      const exported = await api.practice.export(courseId);
      setNotice(`Exported ${exported.observations.length} observations, ${exported.rehearsals.length} rehearsals, ${exported.checklist.length} checklist items.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Export failed.');
    }
  }

  const activeCue = cues[rehearsal?.cueIndex ?? 0] ?? null;
  const words = countWords(body);

  return (
    <section className="glass glass-card" data-card="practice">
      <h1>Presentation practice</h1>
      <p>Course-neutral rehearsal tools. Your writing and media stay local. No class curriculum is embedded.</p>
      <p role="status">{notice}</p>

      <h2>User-authored feedback</h2>
      <form className="form-stack" onSubmit={(e) => { e.preventDefault(); void submitObservation('submitted'); }}>
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value as FeedbackCategory)}>
            {FEEDBACK_CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel[c]}</option>)}
          </select>
        </label>
        <label>
          Observation
          <textarea required maxLength={20000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your own observation." />
        </label>
        <p className="help-text">{words} words · no maximum invented by the app</p>
        <label>
          Rationale <span className="optional">Optional</span>
          <textarea maxLength={10000} value={rationale} onChange={(e) => setRationale(e.target.value)} />
        </label>
        <div className="row-actions">
          <button type="button" onClick={() => void submitObservation('draft')}>Save draft</button>
          <button className="primary" type="submit">Submit observation</button>
        </div>
      </form>
      {observations.map((o) => (
        <article key={o.id} className="glass glass-card">
          <h3>{categoryLabel[o.category]} · {o.status}</h3>
          <p>{o.body}</p>
          <p className="help-text">{o.wordCount} words{o.rationale ? ` · ${o.rationale}` : ''}</p>
        </article>
      ))}

      <h2>Synchronized speech review</h2>
      <label>
        Import local audio or video
        <input type="file" accept="audio/*,video/*,.wav,.mp3,.m4a,.mp4,.webm,.mov" onChange={(e) => void onImportMedia(e.target.files?.[0] ?? null)} />
      </label>
      <ul>
        {media.map((m) => (
          <li key={m.id}>
            {m.filename} · {m.kind}
            <button type="button" onClick={() => void loadTranscript(m)}>Open transcript</button>
          </li>
        ))}
      </ul>
      {selectedMedia && transcript ? (
        <div className="form-stack">
          <p>Seek: {transcript.seekMs} ms · media stored under local app data only</p>
          <label>
            Corrected transcript
            <textarea
              value={transcript.editedText}
              onChange={(e) => setTranscript({ ...transcript, editedText: e.target.value })}
              onBlur={(e) => void saveTranscriptEdit(e.target.value, transcript.seekMs)}
            />
          </label>
          <label>
            Seek (ms)
            <input
              type="number"
              min={0}
              value={transcript.seekMs}
              onChange={(e) => {
                const seekMs = Math.max(0, Number(e.target.value) || 0);
                setTranscript({ ...transcript, seekMs });
              }}
              onBlur={() => void saveTranscriptEdit(transcript.editedText, transcript.seekMs)}
            />
          </label>
          <button type="button" onClick={() => void addAnnotation()}>Annotate at seek</button>
          <button type="button" onClick={() => void checkVisualClaim('Strong eye contact throughout')}>Test audio visual-delivery claim</button>
          {annotations.map((a) => <p key={a.id}>{a.offsetMs} ms · {a.body}</p>)}
          {selectedMedia.kind === 'audio' ? (
            <audio controls src={api.practice.mediaFileUrl(courseId, selectedMedia.id)} />
          ) : (
            <video controls src={api.practice.mediaFileUrl(courseId, selectedMedia.id)} />
          )}
        </div>
      ) : null}

      <h2>Rehearsal, cue cards, slide inspection</h2>
      <form className="form-stack" onSubmit={(e) => { e.preventDefault(); void addCue(); }}>
        <label>Cue title<input required maxLength={500} value={cueTitle} onChange={(e) => setCueTitle(e.target.value)} /></label>
        <label>Cue notes (never rewritten)<textarea required maxLength={20000} value={cueNotes} onChange={(e) => setCueNotes(e.target.value)} /></label>
        <button type="submit">Save cue card</button>
      </form>
      {cues.map((c) => <p key={c.id}>{c.order + 1}. {c.title} — {c.notes}</p>)}
      <div className="row-actions">
        <button type="button" onClick={() => void startRehearsal()}>Start recording</button>
        <button type="button" onClick={() => void stopRehearsal('stop')}>Stop</button>
        <button type="button" onClick={() => void stopRehearsal('cancel')}>Cancel</button>
        <button type="button" onClick={() => void shiftCue(-1)}>Previous cue</button>
        <button type="button" onClick={() => void shiftCue(1)}>Next cue</button>
      </div>
      {rehearsal ? (
        <p>
          Status {rehearsal.status} · timer {Math.floor(rehearsal.elapsedMs / 1000)}s · cue {rehearsal.cueIndex + 1}
          {rehearsal.configuredDurationMs == null ? ' · speech duration unconfigured' : ` · target ${rehearsal.configuredDurationMs} ms`}
        </p>
      ) : null}
      {activeCue ? <p className="help-text">Active cue: {activeCue.title}</p> : null}
      <label>
        Slide text for readability inspection
        <textarea value={slideContent} onChange={(e) => setSlideContent(e.target.value)} />
      </label>
      <button type="button" onClick={() => void inspectSlide()}>Inspect slide</button>
      {slideResult ? <p>{slideResult}</p> : null}
      <label>
        Optional tutor practice question
        <input value={tutorTopic} onChange={(e) => setTutorTopic(e.target.value)} placeholder="Topic from your notes" />
      </label>
      <button type="button" onClick={() => void askTutor()}>Prepare tutor question</button>

      <h2>Preparation checklist and history</h2>
      <form className="form-stack" onSubmit={(e) => { e.preventDefault(); void addChecklistItem(); }}>
        <label>Checklist item<input required value={checkLabel} onChange={(e) => setCheckLabel(e.target.value)} /></label>
        <button type="submit">Add item</button>
      </form>
      {checklist.map((item) => (
        <label key={item.id} className="check-label">
          <input
            type="checkbox"
            checked={item.done}
            onChange={(e) => void api.practice.updateChecklist(courseId, item.id, { done: e.target.checked }).then(refresh).catch((err) => setNotice(err.message))}
          />
          {item.label}
        </label>
      ))}
      <button type="button" onClick={() => void exportPractice()}>Export practice records</button>
      <h3>History</h3>
      {history.map((h) => (
        <p key={h.id}>
          {h.kind} · practice:{h.practiceStatus}
          {h.assignmentStatus ? ` · assignment:${h.assignmentStatus}` : ' · assignment:none'}
          {' — '}{h.summary}
        </p>
      ))}
    </section>
  );
}
