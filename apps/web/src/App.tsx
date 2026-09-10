import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { api } from './client';

const NAV_LABEL: Record<string, string> = {
  home: 'Home',
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
  const [online, setOnline] = useState(true);

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
        const parsed = parseHash(window.location.hash, list.map((item) => item.id));
        setRoute(parsed.route);
        setRecovered(parsed.recovered);
        if (parsed.recovered) setNotice('That saved place was not valid. Your writing is still here.');
        const session = await api.session.get();
        if (session.notice) setNotice(session.notice);
        setOnline(true);
      } catch {
        if (!cancelled) {
          setOnline(false);
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
    if (!courseId) return;
    void api.layouts.get(courseId).then(setLayout).catch(() => undefined);
    void api.drafts.get(`note:${courseId}`).then((row) => { if (row) setDraft(row.body); }).catch(() => undefined);
  }, [courseId]);

  useEffect(() => {
    if (!online) return;
    void api.session.put({
      courseId,
      routeHash: hashFor(route),
      task: route.name,
      notice
    }).catch(() => undefined);
  }, [courseId, route, notice, online]);

  async function saveAppearance(next: Appearance) {
    const parsed = parseAppearance(next);
    setAppearanceState(parsed);
    applyAppearance(parsed, true);
    try { await api.appearance.put(parsed); } catch { /* local cache remains */ }
  }

  async function addCourse(event: React.FormEvent) {
    event.preventDefault();
    const created = await api.courses.create(courseName);
    setCourses((current) => [...current, created]);
    setCourseName('');
    syncRoute({ name: 'home', courseId: created.id });
  }

  function goNav(id: string) {
    setMenuOpen(false);
    if (id === 'settings') { syncRoute({ name: 'settings' }); return; }
    if (id === 'home') { syncRoute({ name: 'home', courseId: courseId ?? courses[0]?.id ?? null }); return; }
    if (!courseId) { syncRoute({ name: 'firstuse' }); return; }
    syncRoute({ name: id as AppRoute['name'], courseId } as AppRoute);
  }

  async function persistLayout(next: CardLayout) {
    setLayout(next);
    if (courseId) {
      try { await api.layouts.put(courseId, next); } catch { /* keep local */ }
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
          <textarea value={draft} onChange={(event) => {
            const body = event.target.value;
            setDraft(body);
            if (courseId) void api.drafts.put({ key: `note:${courseId}`, courseId, body }).catch(() => undefined);
          }} />
        </label>
      ) : (
        <p>{id === 'source' ? 'No source is open yet.' : 'Nothing here yet. This screen stays empty until you add your own material.'}</p>
      )}
    </article>
  )), [layout, draft, courseId, move]);

  return (
    <>
      <a className="skip" href="#main">Skip to main content</a>
      <div className="preview-strip">CollegeNotes local workspace · no cloud account</div>
      <div className="app-shell">
        <aside id="navigation" className={menuOpen ? 'open' : undefined} aria-label="Main navigation">
          <div className="brand">CollegeNotes<small>{'{11:11}'}</small></div>
          {NAV_DESTINATIONS.map((id) => (
            <a
              key={id}
              href={id === 'settings' ? '#/settings' : courseId ? `#/courses/${courseId}${id === 'home' ? '' : `/${id}`}` : '#/home'}
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
          {notice ? <p className="notice" role="status">{notice}</p> : null}
          <main id="main" tabIndex={-1} data-recovered={recovered ? 'true' : 'false'}>
            {screen === 'firstuse' || (empty && screen === 'home') ? (
              <section>
                <p className="eyebrow">Start here</p>
                <h1>Add your first course</h1>
                <p>Only a name is required. Term and instructor stay optional. Nothing is invented for you.</p>
                <form className="form-stack" onSubmit={(event) => void addCourse(event)}>
                  <label>
                    Course name
                    <input value={courseName} onChange={(event) => setCourseName(event.target.value)} required />
                  </label>
                  <button type="submit">Create course</button>
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
