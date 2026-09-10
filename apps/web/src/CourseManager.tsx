import { useEffect, useRef, useState } from 'react';
import { COURSE_MODULES, type Course, type CourseModuleId, type ModuleSelection } from '@collegenotes/domain';
import { api } from './client';

type Props = { active: boolean; onCollection: (courses: Course[]) => void };
const errors: Record<string, string> = {
  invalid_name: 'Enter a course name between 1 and 200 characters, without line breaks.',
  invalid_description: 'Keep the description under 10,000 characters.',
  course_busy: 'A course job is still running. Finish or cancel it before archiving or deleting.',
  course_unavailable: 'This course changed or is no longer available. Refresh the collection.',
  original_missing: 'An original file is missing. Export or deletion could not start; your course remains here.',
  original_checksum_mismatch: 'An original file differs from its saved checksum. Export or deletion stopped to protect your data.',
  unsafe_original_path: 'An original file has an unsafe location. The operation was stopped.',
  deletion_incomplete_retry: 'Deletion is incomplete. The course is closed to new work. Use Retry deletion to finish cleanup after the file problem is resolved.',
  deletion_confirmation_required: 'Type the exact course name and acknowledge the separate backups.'
};
function message(error: unknown) { return errors[error instanceof Error ? error.message : ''] ?? 'The local service could not complete this action. Your entered text is preserved. Check the service and try again.'; }

export function CourseManager({ active, onCollection }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'archived' | 'cleanup'>('active');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Course | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [modules, setModules] = useState<ModuleSelection[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [backups, setBackups] = useState(false);
  const [dirty, setDirty] = useState(false);
  const editor = useRef<HTMLElement>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  const selectedId = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  function apply(list: Course[]) { setCourses(list); onCollection(list.filter(c => !c.archivedAt && !c.trashedAt)); }
  async function refresh() {
    setLoading(true); setError('');
    try { apply(await api.courses.collection()); } catch (e) { setError(message(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (!active) return; let cancelled = false;
    setLoading(true);
    void api.courses.collection().then(list => { if (!cancelled) { setCourses(list); onCollection(list.filter(c => !c.archivedAt && !c.trashedAt)); } }).catch(e => { if (!cancelled) setError(message(e)); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [onCollection, active]);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => { if (dirtyRef.current) event.preventDefault(); };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, []);
  function close() {
    if (dirty && !window.confirm('Discard your unsaved course details?')) return;
    selectedId.current = null; setSelected(null); setDirty(false); setDeleting(false); setModules(null);
    lastTrigger.current?.focus();
  }
  async function open(course: Course, trigger: HTMLButtonElement) {
    if (dirty && !window.confirm('Discard your unsaved course details?')) return;
    lastTrigger.current = trigger; selectedId.current = course.id; setSelected(course); setName(course.name); setDescription(course.description); setDirty(false); setDeleting(false); setConfirmation(''); setBackups(false); setError(''); setStatus(''); setModules(null);
    requestAnimationFrame(() => editor.current?.focus());
    if (!course.trashedAt) {
      try { const list = await api.courses.modules(course.id); if (selectedId.current === course.id) setModules(list); }
      catch (e) { if (selectedId.current === course.id) setError(message(e)); }
    }
  }
  async function action(run: () => Promise<void>) {
    if (busy) return; setBusy(true); setError(''); setStatus('');
    try { await run(); } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }
  function replace(course: Course) { apply(courses.map(c => c.id === course.id ? course : c)); setSelected(course); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!selected) return;
    await action(async () => { const saved = await api.courses.edit(selected.id,name,description); replace(saved); setName(saved.name); setDirty(false); setStatus('Course details saved on this Mac.'); });
  }
  async function toggle(moduleId: CourseModuleId, enabled: boolean) {
    if (!selected) return;
    await action(async () => { setModules(await api.courses.setModule(selected.id,moduleId,enabled)); setStatus('Module selection saved.'); });
  }
  const visible = courses.filter(c => (filter === 'cleanup' ? !!c.trashedAt : filter === 'archived' ? !!c.archivedAt && !c.trashedAt : !c.archivedAt && !c.trashedAt) && `${c.name} ${c.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <section className="course-manager">
    <div className="page-heading"><div><p className="eyebrow">Your learning, organized</p><h1 id="courses-heading" tabIndex={-1}>Courses</h1><p>A place for each subject. Everything starts with your own material.</p></div><a className="button primary" href="#/courses/new">+ Create course</a></div>
    <div className="collection-toolbar"><div className="segmented" aria-label="Course collection">
      {(['active','archived','cleanup'] as const).map(value => <button key={value} type="button" aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value==='cleanup' ? 'Deletion pending' : value==='active' ? 'Active' : 'Archived'} <span>{courses.filter(c=>value==='cleanup'?!!c.trashedAt:value==='archived'?!!c.archivedAt&&!c.trashedAt:!c.archivedAt&&!c.trashedAt).length}</span></button>)}
    </div><label className="search-label">Find a course<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search names and descriptions" /></label><button type="button" disabled={busy||loading} onClick={()=>void refresh()}>Refresh</button></div>
    {error && <p className="notice error" role="alert">{error}</p>}{status && <p className="notice" role="status">{status}</p>}
    {loading ? <p role="status">Loading your courses…</p> : !visible.length ? <div className="empty-panel glass"><p className="eyebrow">{query ? 'No matches' : filter==='active'?'Room to begin':'Nothing here'}</p><h2>{query?'Try another search.':filter==='archived'?'No archived courses.':filter==='cleanup'?'No deletion needs attention.':'Create a course of your own.'}</h2><p>{filter==='archived'?'Archiving puts a course away while keeping its notes, materials and settings.':filter==='cleanup'?'Interrupted deletion appears here until you retry cleanup.':'Courses contain only what you choose to add.'}</p></div> : <div className="course-grid">{visible.map((c,i)=><article key={c.id} className="course-tile glass" data-tone={i%3}>
      <div className="course-tile-top"><span className="course-mark" aria-hidden="true">{c.name.slice(0,1).toLocaleUpperCase()}</span><span className="badge">{c.trashedAt?'Cleanup required':c.archivedAt?'Archived':'Local course'}</span></div>
      <h2>{c.name}</h2><p className="course-description">{c.description||'No description yet. Make this space your own.'}</p><p className="course-date">Created {new Date(c.createdAt).toLocaleDateString()} · ID {c.id.slice(-8)}</p>
      <div className="actions">{!c.archivedAt&&!c.trashedAt&&<a className="button primary" href={`#/courses/${c.id}`}>Open course <span aria-hidden="true">↗</span></a>}<button type="button" disabled={busy} onClick={e=>void open(c,e.currentTarget)}>{c.trashedAt?'Retry deletion':'Manage course'}</button></div>
    </article>)}</div>}
    {selected && <section className="course-editor glass" ref={editor} tabIndex={-1} aria-labelledby="course-editor-title">
      <div className="page-heading"><div><p className="eyebrow">Course settings · {selected.id.slice(-8)}</p><h2 id="course-editor-title">{selected.name}</h2></div><button type="button" disabled={busy} onClick={close}>Close settings</button></div>
      {selected.trashedAt ? <p className="notice">Deletion has started. This course cannot be opened, edited or restored. Retry to finish removing its local records and files.</p> : <>
        <form className="form-stack" onSubmit={e=>void save(e)}><label>Course name<input required maxLength={200} value={name} disabled={busy} onChange={e=>{setName(e.target.value);setDirty(true);}} /></label><label>Description<textarea maxLength={10000} rows={4} value={description} disabled={busy} onChange={e=>{setDescription(e.target.value);setDirty(true);}} /></label><div className="actions"><button className="primary" disabled={busy||!dirty||!name.trim()} type="submit">{busy?'Working…':'Save details'}</button>{dirty&&<span role="status">Unsaved changes</span>}</div></form>
        <div className="module-heading"><h3>Make room for how you learn</h3><p>Choose the modules for this course. Turning one off keeps its saved work. Selections for future tools are saved; they do not connect a service.</p></div>
        {modules ? <fieldset disabled={busy||!!selected.archivedAt} className="module-grid"><legend>Course modules{selected.archivedAt?' · restore this course to change selections':''}</legend>{COURSE_MODULES.map(m=><label key={m.id} className="module-option"><input type="checkbox" checked={modules.some(row=>row.moduleId===m.id&&row.enabled)} onChange={e=>void toggle(m.id,e.target.checked)} /><span><strong>{m.label}</strong><small>{m.available?'Available now · basic local note':'Planned · selection saved for later'}</small><span>{m.description}</span></span></label>)}</fieldset> : <p role="status">Module settings have not loaded. Close and reopen settings to retry.</p>}
        <div className="course-tools"><div><h3>Keep a copy</h3><p>Export this course and its saved material as portable JSON. Connection credentials are excluded. Importing the exported course is planned for the portability phase.</p><button type="button" disabled={busy||dirty} onClick={()=>void action(async()=>{
          const data = await api.courses.export(selected.id); const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); const link=document.createElement('a'); link.href=url;link.download=`course-${selected.id}.json`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);setStatus('Export prepared. Check your browser downloads for the JSON file.');
        })}>Export course</button></div><div><h3>{selected.archivedAt?'Bring it back':'Put it away for now'}</h3><p>Archive preserves all course data. Restore returns it to your active collection.</p><button type="button" disabled={busy||dirty} onClick={()=>void action(async()=>{const updated=await (selected.archivedAt?api.courses.restore(selected.id):api.courses.archive(selected.id));replace(updated);setFilter(updated.archivedAt?'archived':'active');setStatus(updated.archivedAt?'Course archived. Your work is preserved.':'Course restored.');})}>{selected.archivedAt?'Restore course':'Archive course'}</button></div></div>
      </>}
      <div className="danger-zone"><h3>{selected.trashedAt?'Finish permanent deletion':'Permanently delete this course'}</h3><p>Removes the course, notes, originals, module settings and linked learning data from this app. This cannot be undone. Archive instead if you want to return later. Separate exports and backups remain.</p>
      {!deleting ? <button className="danger" type="button" disabled={busy||dirty} onClick={()=>{setDeleting(true);setConfirmation('');setBackups(false);}}>{selected.trashedAt?'Retry deletion':'Review permanent deletion'}</button> : <form className="form-stack" onSubmit={e=>{e.preventDefault();void action(async()=>{try {await api.courses.delete(selected.id,confirmation,backups);apply(courses.filter(c=>c.id!==selected.id));setSelected(null);selectedId.current=null;setDeleting(false);setStatus('Course permanently deleted from this app. Separate backups were not changed.');document.getElementById('courses-heading')?.focus();} catch(e) {const list=await api.courses.collection().catch(()=>null);if(list){apply(list);const next=list.find(c=>c.id===selected.id);if(next){setSelected(next);if(next.trashedAt)setFilter('cleanup');}}throw e;}});}}>
        <label>Type “{selected.name}” to confirm<input value={confirmation} disabled={busy} onChange={e=>setConfirmation(e.target.value)} autoComplete="off" /></label><label className="check-label"><input type="checkbox" checked={backups} disabled={busy} onChange={e=>setBackups(e.target.checked)} />I understand separate exports and backups are not deleted.</label><div className="actions"><button type="button" disabled={busy} onClick={()=>setDeleting(false)}>Cancel</button><button className="danger" type="submit" disabled={busy||dirty||confirmation!==selected.name||!backups}>{busy?'Deleting…':'Permanently delete'}</button></div>
      </form>}{dirty&&<p>Save or discard your course details before exporting, archiving or deleting.</p>}</div>
    </section>}
  </section>;
}
