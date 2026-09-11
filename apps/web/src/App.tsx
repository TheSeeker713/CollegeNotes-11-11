import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  COURSE_MODULES,
  type ModuleSelection,
  DEFAULT_APPEARANCE,
  DEFAULT_CARD_LAYOUT,
  NAV_DESTINATIONS,
  cancelMove,
  hashFor,
  nudge,
  parseAppearance,
  parseHash,
  startMove,
  togglePin,
  type Appearance,
  type AppRoute,
  type CardId,
  type CardLayout,
  type Course,
  type MoveSession
} from '@collegenotes/domain';
import { applyAppearance, readStoredAppearance } from '@collegenotes/ui';
import type { ProviderDefinition } from '@collegenotes/providers/contracts';
import { api } from './client';
import { Materials } from './Materials';
import { CourseManager } from './CourseManager';

const NAV_LABEL: Record<string, string> = {
  home: 'Home',
  courses: 'Courses',
  connections: 'Connections',
  research: 'Research',
  sources: 'Sources',
  study: 'Study',
  practice: 'Practice',
  requirements: 'Requirements',
  progress: 'Progress',
  settings: 'Settings'
};

export function App() {
  const [appearance, setAppearanceState] = useState<Appearance>(readStoredAppearance);
  const [courses, setCourses] = useState<Course[]>([]);
  const [route, setRoute] = useState<AppRoute>({ name: 'home', courseId: null });
  const [recovered, setRecovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [layout, setLayout] = useState<CardLayout>({ order: [...DEFAULT_CARD_LAYOUT.order], pinned: [] });
  const [move, setMove] = useState<MoveSession | null>(null);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [courseName, setCourseName] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [modules, setModules] = useState<ModuleSelection[] | null>(null);
  const [modulesCourseId, setModulesCourseId] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [draftCourseId, setDraftCourseId] = useState<string | null>(null);
  const draftEdits = useRef(0);
  const layoutEdits = useRef(0);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const localDrafts = useRef(new Map<string, string>());
  const [providers, setProviders] = useState<ProviderDefinition[]>([]);
  const [connectionCount, setConnectionCount] = useState<number | null>(null);

  const courseId = 'courseId' in route ? route.courseId : null;
  const course = courses.find((item) => item.id === courseId) ?? null;

  const syncRoute = useCallback((next: AppRoute, recoveredRoute = false) => {
    setRoute(next);
    setRecovered(recoveredRoute);
    const hash = hashFor(next);
    if (window.location.hash !== hash) window.location.hash = hash;
  }, []);

  useEffect(() => {
    applyAppearance(appearance, true);
  }, [appearance]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const remote = await api.appearance.get();
        if (cancelled) return;
        setAppearanceState(parseAppearance(remote));
        const list = await api.courses.list();
        if (cancelled) return;
        setCourses(list);
        const session = await api.session.get();
        if (cancelled) return;
        const parsed = parseHash(window.location.hash || session.routeHash, list.map((item) => item.id));
        setRoute(parsed.route);
        setRecovered(parsed.recovered);
        if (parsed.recovered) setNotice('That saved place was not valid. Your writing is still here.');
        if (session.notice) setNotice(session.notice);
        setOnline(true);
        setInitialized(true);
      } catch {
        if (!cancelled) {
          setOnline(false);
          setInitialized(true);
          const parsed = parseHash(window.location.hash, []);
          setRoute(parsed.route);
          setRecovered(parsed.recovered);
          if (parsed.recovered) setNotice('That saved place was not valid. Your writing is still here.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onHash = () => {
      const parsed = parseHash(window.location.hash, courses.map((item) => item.id));
      setRoute(parsed.route);
      setRecovered(parsed.recovered);
      if (parsed.recovered) setNotice('That saved place was not valid. Your writing is still here.');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [courses]);

  useEffect(() => {
    let cancelled = false;
    const edit = draftEdits.current;
    const layoutEdit = layoutEdits.current;
    setLayout({ order: [...DEFAULT_CARD_LAYOUT.order], pinned: [] });
    setMove(null);
    setModules(null);
    setModulesCourseId(courseId);
    setDraftCourseId(courseId);
    setDraft(courseId ? localDrafts.current.get(courseId) ?? '' : '');
    if (courseId) {
      void api.courses.modules(courseId).then(value => { if (!cancelled) setModules(value); }).catch(() => { if (!cancelled) setNotice('Module selections could not be loaded. Reopen this course to retry.'); });
      void api.layouts.get(courseId).then((value) => { if (!cancelled && layoutEdits.current === layoutEdit) setLayout(value); }).catch(() => { if (!cancelled) setNotice('Layout could not be loaded.'); });
      if (!localDrafts.current.has(courseId)) void api.drafts.get(`note:${courseId}`).then((row) => {
        if (!cancelled && draftEdits.current === edit) setDraft(row?.body ?? '');
      }).catch(() => { if (!cancelled) setNotice('Note could not be loaded. Retry by reopening this course.'); });
    }
    return () => { cancelled = true; };
  }, [courseId]);

  useEffect(() => {
    if (route.name !== 'connections') return;
    let cancelled = false;
    void api.connections().then((result) => {
      if (!cancelled) { setProviders(result.availableProviders); setConnectionCount(result.connections.length); }
    }).catch(() => { if (!cancelled) setNotice('Connections could not be loaded. Check the local service and reload.'); });
    return () => { cancelled = true; };
  }, [route.name]);

  useEffect(() => {
    if (!online || !initialized) return;
    void api.session.put({
      courseId,
      routeHash: hashFor(route),
      task: route.name,
      notice
    }).catch(() => undefined);
  }, [courseId, route, notice, online, initialized]);

  async function saveAppearance(next: Appearance) {
    const parsed = parseAppearance(next);
    setAppearanceState(parsed);
    applyAppearance(parsed, true);
    try { await api.appearance.put(parsed); } catch { setNotice('Appearance could not be saved to the local service. The current window keeps your choice.'); }
  }

  async function addCourse(event: React.FormEvent) {
    event.preventDefault();
    if (creatingCourse) return;
    setCreatingCourse(true);
    try {
      const created = await api.courses.create(courseName, courseDescription);
      setCourses((current) => [...current, created]);
      setCourseName('');
      setCourseDescription('');
      setOnline(true);
      syncRoute({ name: 'home', courseId: created.id });
    } catch { setNotice('Course could not be saved. Your entered name is preserved; try again when the local service is available.'); }
    finally { setCreatingCourse(false); }
  }

  function goNav(id: string) {
    setMenuOpen(false);
    if (id === 'settings' || id === 'courses' || id === 'connections' || id === 'research') { syncRoute({ name: id }); return; }
    if (id === 'home') { syncRoute({ name: 'home', courseId: courseId ?? courses[0]?.id ?? null }); return; }
    if (!courseId) { syncRoute({ name: 'firstuse' }); return; }
    syncRoute({ name: id as AppRoute['name'], courseId } as AppRoute);
  }

  async function persistLayout(next: CardLayout) {
    layoutEdits.current += 1;
    setLayout(next);
    if (courseId) {
      try { await api.layouts.put(courseId, next); } catch { setNotice('Layout could not be saved. The current window keeps your arrangement.'); }
    }
  }

  function onCardKey(event: React.KeyboardEvent, card: CardId) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (move && move.card === card) {
        setMove(null);
        void persistLayout(layout);
      } else {
        const session = startMove(layout, card);
        if (session) setMove(session);
      }
    } else if (move && move.card === card && (event.key === 'ArrowUp' || event.key === 'ArrowLeft')) {
      event.preventDefault();
      void persistLayout(nudge(layout, card, -1));
    } else if (move && move.card === card && (event.key === 'ArrowDown' || event.key === 'ArrowRight')) {
      event.preventDefault();
      void persistLayout(nudge(layout, card, 1));
    } else if (event.key === 'Escape' && move) {
      event.preventDefault();
      void persistLayout(cancelMove(move));
      setMove(null);
    }
  }

  const empty = courses.length === 0;
  const screen = route.name;

  const enabledModules = modulesCourseId === courseId ? modules?.filter(m => m.enabled).map(m => m.moduleId) ?? [] : [];
  const cardModules = { source: 'reading', notes: 'notes', study: 'study', listen: 'audio' } as const;
  const cards = useMemo(() => layout.order.filter(id => enabledModules.includes(cardModules[id])).map((id) => (
    <article key={id} className="glass glass-card" data-card={id} data-pinned={layout.pinned.includes(id) ? 'true' : 'false'}>
      <header>
        <h2>{{ source: 'Reading', notes: 'Your notes', study: 'Study', listen: 'Audio' }[id]}</h2>
        <div className="actions">
          <button type="button" data-handle={id} onKeyDown={(event) => onCardKey(event, id)}>Move</button>
          <button type="button" onClick={() => void persistLayout(togglePin(layout, id))}>{layout.pinned.includes(id) ? 'Unpin' : 'Pin'}</button>
        </div>
      </header>
      {id === 'notes' ? (
        <label>
          Your note
          <textarea value={draftCourseId === courseId ? draft : ''} onChange={(event) => {
            const body = event.target.value;
            draftEdits.current += 1;
            setDraftCourseId(courseId);
            setDraft(body);
            if (courseId) localDrafts.current.set(courseId, body);
            if (courseId) void api.drafts.put({ key: `note:${courseId}`, courseId, body }).catch(() => setNotice('Note could not be saved. Keep this window open; your text remains here.'));
          }} />
        </label>
      ) : (
        <p>{id === 'source' ? 'Reading is selected for this course. Import and reading tools arrive in later phases.' : 'Selected for this course. This tool is not available in the current build.'}</p>
      )}
    </article>
  )), [layout, draft, courseId, move, draftCourseId, modules, modulesCourseId]);

  return (
    <>
      <a className="skip" href="#main" onClick={(event) => { event.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to main content</a>
      <div className="preview-strip"><span className="status-dot" aria-hidden="true" /> Your private learning workspace <span>Stored on this Mac</span></div>
      <div className="app-shell">
        <aside id="navigation" className={menuOpen ? 'open' : undefined} aria-label="Main navigation" onKeyDown={(event) => { if (event.key === 'Escape') { setMenuOpen(false); document.getElementById('menu')?.focus(); } }}>
          <div className="brand"><span className="brand-symbol" aria-hidden="true">cn.</span>CollegeNotes<small>A little structure. More room to learn.</small></div>
          <p className="nav-caption">Workspace</p>
          {NAV_DESTINATIONS.map((id) => (
            <a
              key={id}
              href={['settings', 'courses', 'connections', 'research'].includes(id) ? `#/${id}` : courseId ? `#/courses/${courseId}${id === 'home' ? '' : `/${id}`}` : '#/home'}
              aria-current={screen === id || (id === 'home' && screen === 'firstuse') ? 'page' : undefined}
              onClick={(event) => { event.preventDefault(); goNav(id); }}
            >
              <span>{NAV_LABEL[id]}</span><span className="nav-arrow" aria-hidden="true">↗</span>
            </a>
          ))}
        </aside>
        <div className="content">
          <div className="topbar">
            <button id="menu" type="button" aria-expanded={menuOpen} aria-controls="navigation" onClick={() => setMenuOpen((value) => !value)}>Menu</button>
            <span className="breadcrumb">Workspace <span aria-hidden="true">/</span> {course?.name ?? NAV_LABEL[screen] ?? 'New course'}</span><a className="appearance-link" href="#/settings">{appearance.theme === 'botanical' ? 'Botanical' : 'Brutalist'} · {appearance.mode === 'dark' ? 'Dark' : 'Light'}</a>
          </div>
          {!online && initialized ? <p className="notice" role="status">Local service unavailable. Reopen or reload after starting it. Unsaved writing stays in this window.</p> : null}
          {notice ? <p className="notice" role="status">{notice}</p> : null}
          <main id="main" tabIndex={-1} data-recovered={recovered ? 'true' : 'false'}>
            {!initialized ? <p role="status">Loading your local workspace…</p> : null}
            {initialized && (screen === 'firstuse' || (empty && screen === 'home')) ? (
              <section className="welcome-panel glass">
                <p className="eyebrow">A fresh page</p>
                <h1>{empty ? 'Make room for your next idea.' : 'Start a new course.'}</h1>
                <p>Only a name is required. Courses start empty. You choose what to add.</p>
                <form className="form-stack" onSubmit={(event) => void addCourse(event)}>
                  <label>
                    Course name
                    <input value={courseName} maxLength={200} placeholder="What are you learning?" onChange={(event) => setCourseName(event.target.value)} required disabled={creatingCourse} />
                  </label>
                  <label>Description <span className="optional">Optional</span><textarea rows={3} maxLength={10000} value={courseDescription} disabled={creatingCourse} onChange={event=>setCourseDescription(event.target.value)} placeholder="A short description, in your own words." /></label>
                  <button className="primary" type="submit" disabled={creatingCourse || !courseName.trim()}>{creatingCourse ? 'Saving course…' : 'Create course'}</button>
                </form>
              </section>
            ) : null}
            {screen === 'home' && course ? (
              <section className="course-home glass">
                <div className="page-heading"><div><p className="eyebrow">Your course · {course.id.slice(-8)}</p><h1>{course.name}</h1><p>{course.description || 'Your space to collect ideas and make sense of what you learn.'}</p></div><a className="button" href="#/courses">Manage course</a></div>
                <div className="course-home-footer"><span className="badge">Local workspace</span><span>{modules === null ? 'Loading module selections…' : enabledModules.length ? COURSE_MODULES.filter(m=>enabledModules.includes(m.id)).map(m=>m.label).join(' · ') : 'No modules selected yet'}</span><span>No account required</span></div>
              </section>
            ) : null}
            {initialized ? <div hidden={screen !== 'courses' && !(screen === 'home' && !course && !empty)}><CourseManager active={screen === 'courses' || (screen === 'home' && !course && !empty)} onCollection={setCourses} /></div> : null}
            {screen === 'connections' ? (
              <section><h1>Connections</h1><p>{connectionCount === null ? 'Loading local connection information…' : connectionCount === 0 ? 'No services connected. Your local courses work without an AI account.' : `${connectionCount} saved connection configurations. Live authentication is not available in this build.`}</p>
                <p>OpenAI is optional. Adding, toggling, disconnecting and removing services will be available with provider connections.</p>
                {providers.map((provider) => <article className="glass glass-card" key={provider.id}><h2>{provider.label}</h2>
                  <p>Not connected · connection setup is not available in this build.</p>
                  <ul>{provider.auth.map((auth) => <li key={auth.method}>{auth.method === 'apiKey' ? 'API credential' : 'Account sign-in'}: {auth.evidence === 'verified_documentation' ? 'documented route; integration pending' : 'unavailable until an official integration route is verified'}</li>)}</ul>
                </article>)}
                <p>Additional providers will use the same connection system. No account is required or automatically selected.</p>
              </section>
            ) : null}
            {screen === 'research' ? (
              <section><h1>Research</h1><p>No research has been started here. Internet research is not available in this build yet.</p>
                <p>You will choose a course, provider and query, and approve any private excerpts before sending. Saved evidence will retain its sources, dates and claim links.</p>
                <a href="#/connections">View connections</a>
              </section>
            ) : null}
            {screen === 'sources' && courseId ? <Materials key={courseId} courseId={courseId} /> : null}
            {['study', 'practice', 'requirements', 'progress'].includes(screen) ? (
              <section>
                <h1>{NAV_LABEL[screen]}</h1>
                <p>This tool is planned for a later phase. Manage your course to select the modules you want to use.</p>
              </section>
            ) : null}
            {screen === 'settings' ? (
              <section>
                <h1>Appearance</h1>
                <div className="form-stack">
                  <label>
                    Theme
                    <select value={appearance.theme} onChange={(event) => void saveAppearance({ ...appearance, theme: event.target.value as Appearance['theme'] })}>
                      <option value="botanical">Botanical Organic Glass</option>
                      <option value="brutalist">Brutalist Glass Lab</option>
                    </select>
                  </label>
                  <label>
                    <input type="checkbox" checked={appearance.mode === 'dark'} onChange={(event) => void saveAppearance({ ...appearance, mode: event.target.checked ? 'dark' : 'light' })} />
                    Dark mode
                  </label>
                  <label>
                    Density
                    <select value={appearance.density} onChange={(event) => void saveAppearance({ ...appearance, density: event.target.value as Appearance['density'] })}>
                      <option value="comfortable">Comfortable</option>
                      <option value="compact">Compact</option>
                    </select>
                  </label>
                  <label>
                    <input type="checkbox" checked={appearance.reduceMotion} onChange={(event) => void saveAppearance({ ...appearance, reduceMotion: event.target.checked })} />
                    Reduce motion
                  </label>
                  <label>
                    <input type="checkbox" checked={appearance.reduceTransparency} onChange={(event) => void saveAppearance({ ...appearance, reduceTransparency: event.target.checked })} />
                    Reduce transparency
                  </label>
                  <button type="button" onClick={() => void saveAppearance({ ...DEFAULT_APPEARANCE })}>Reset appearance</button>
                </div>
              </section>
            ) : null}
            {course && (screen === 'home' || screen === 'study') ? (
              <section>
                <h2>Your workspace</h2>
                {!enabledModules.length && <div className="empty-panel glass"><h3>Choose how you want to work.</h3><p>Enable Notes to begin writing locally, or select other modules for later. Saved work stays with the course when you turn a module off.</p><a className="button primary" href="#/courses">Choose course modules</a></div>}
                {cards.length > 0 && <p className="help-text">{move ? `Moving ${move.card}. Arrows move, Enter places, Escape cancels.` : 'Arrange your workspace: focus Move and press Enter, then use the arrow keys.'}</p>}
                <div className="actions">
                  <button type="button" onClick={() => { setMove(null); void persistLayout({ order: [...DEFAULT_CARD_LAYOUT.order], pinned: layout.pinned }); }}>Reset layout</button>
                </div>
                <div className="card-row" data-count={cards.length}>{cards}</div>
              </section>
            ) : null}
          </main>
        </div>
      </div>
    </>
  );
}
