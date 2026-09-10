import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
    setDraftCourseId(courseId);
    setDraft(courseId ? localDrafts.current.get(courseId) ?? '' : '');
    if (courseId) {
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
      const created = await api.courses.create(courseName);
      setCourses((current) => [...current, created]);
      setCourseName('');
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

  const cards = useMemo(() => layout.order.map((id) => (
    <article key={id} className="glass glass-card" data-card={id} data-pinned={layout.pinned.includes(id) ? 'true' : 'false'}>
      <header>
        <h2>{id}</h2>
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
        <p>{id === 'source' ? 'No source is open yet.' : 'Nothing here yet. This screen stays empty until you add your own material.'}</p>
      )}
    </article>
  )), [layout, draft, courseId, move, draftCourseId]);

  return (
    <>
      <a className="skip" href="#main" onClick={(event) => { event.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to main content</a>
      <div className="preview-strip">CollegeNotes local workspace · no cloud account</div>
      <div className="app-shell">
        <aside id="navigation" className={menuOpen ? 'open' : undefined} aria-label="Main navigation" onKeyDown={(event) => { if (event.key === 'Escape') { setMenuOpen(false); document.getElementById('menu')?.focus(); } }}>
          <div className="brand">CollegeNotes<small>{'{11:11}'}</small></div>
          {NAV_DESTINATIONS.map((id) => (
            <a
              key={id}
              href={['settings', 'courses', 'connections', 'research'].includes(id) ? `#/${id}` : courseId ? `#/courses/${courseId}${id === 'home' ? '' : `/${id}`}` : '#/home'}
              aria-current={screen === id || (id === 'home' && screen === 'firstuse') ? 'page' : undefined}
              onClick={(event) => { event.preventDefault(); goNav(id); }}
            >
              {NAV_LABEL[id]}
            </a>
          ))}
        </aside>
        <div className="content">
          <div className="topbar">
            <button id="menu" type="button" aria-expanded={menuOpen} aria-controls="navigation" onClick={() => setMenuOpen((value) => !value)}>Menu</button>
            <span>{appearance.theme} · {appearance.mode}</span>
          </div>
          {!online && initialized ? <p className="notice" role="status">Local service unavailable. Reopen or reload after starting it. Unsaved writing stays in this window.</p> : null}
          {notice ? <p className="notice" role="status">{notice}</p> : null}
          <main id="main" tabIndex={-1} data-recovered={recovered ? 'true' : 'false'}>
            {!initialized ? <p role="status">Loading your local workspace…</p> : null}
            {initialized && (screen === 'firstuse' || (empty && screen === 'home')) ? (
              <section>
                <p className="eyebrow">Start here</p>
                <h1>Add your first course</h1>
                <p>Only a name is required. Courses start empty. You choose what to add.</p>
                <form className="form-stack" onSubmit={(event) => void addCourse(event)}>
                  <label>
                    Course name
                    <input value={courseName} onChange={(event) => setCourseName(event.target.value)} required />
                  </label>
                  <button type="submit" disabled={creatingCourse}>{creatingCourse ? 'Saving course…' : 'Create course'}</button>
                </form>
              </section>
            ) : null}
            {screen === 'home' && course ? (
              <section>
                <p className="eyebrow">{course.name}</p>
                <h1>Continue where you stopped.</h1>
                <p>Resume is ready when you have a saved task. No generated course facts.</p>
                <div className="actions">
                  <a className="button" href={`#/courses/${course.id}/sources`}>Open sources</a>
                </div>
              </section>
            ) : null}
            {screen === 'courses' ? (
              <section><h1>Your courses</h1><p>{courses.length ? 'Open a course to continue your local work.' : 'No courses yet. Create an empty course to get started.'}</p>
                <a className="button" href="#/courses/new">Create course</a>
                <ul>{courses.map((item) => <li key={item.id}><a href={`#/courses/${item.id}`}>{item.name}</a></li>)}</ul>
                <p>Course editing, archive, export and deletion are not available in this build yet.</p>
              </section>
            ) : null}
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
            {screen === 'sources' ? (
              <section>
                <h1>Sources</h1>
                <p>No sources yet. Import arrives in a later phase. Your empty list is honest.</p>
              </section>
            ) : null}
            {['study', 'practice', 'requirements', 'progress'].includes(screen) ? (
              <section>
                <h1>{NAV_LABEL[screen]}</h1>
                <p>Nothing recorded yet. Unknown course facts stay unknown.</p>
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
                <h2>Workspace cards</h2>
                <p>{move ? `Moving ${move.card}. Arrows move, Enter places, Escape cancels.` : 'Enter on Move starts keyboard arrange.'}</p>
                <div className="actions">
                  <button type="button" onClick={() => { setMove(null); void persistLayout({ order: [...DEFAULT_CARD_LAYOUT.order], pinned: layout.pinned }); }}>Reset layout</button>
                </div>
                <div className="card-row" data-count="4">{cards}</div>
              </section>
            ) : null}
          </main>
        </div>
      </div>
    </>
  );
}
