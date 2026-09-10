import { useEffect, useState } from 'react';
import { DEFAULT_APPEARANCE, parseAppearance, type Appearance } from '@collegenotes/domain';
import { tokensFor } from '@collegenotes/ui';
import { detectGraphics, textEquivalent } from '@collegenotes/visuals';

const PREF_KEY = 'collegenotes-appearance';

function loadAppearance(): Appearance {
  try {
    return parseAppearance(JSON.parse(localStorage.getItem(PREF_KEY) ?? 'null'));
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function App() {
  const [appearance, setAppearance] = useState<Appearance>(loadAppearance);
  const [health, setHealth] = useState<string>('Local service not queried yet.');
  const tokens = tokensFor(appearance);
  const graphics = detectGraphics(typeof document === 'undefined' ? null : document.createElement('canvas'));

  useEffect(() => {
    document.documentElement.dataset.theme = appearance.theme;
    document.documentElement.dataset.mode = appearance.mode;
    localStorage.setItem(PREF_KEY, JSON.stringify(appearance));
  }, [appearance]);

  async function ping() {
    try {
      const res = await fetch('http://127.0.0.1:4781/health', { headers: { origin: 'http://127.0.0.1:5173' } });
      const body = await res.json() as { ok?: boolean; tutor?: string };
      setHealth(body.ok ? `Service healthy. ${body.tutor ?? ''}` : 'Service reported not ok.');
    } catch {
      setHealth('Local service unavailable. Prepared UI still renders.');
    }
  }

  return (
    <main className="glass" style={{ margin: 32, padding: 24, maxWidth: 720, background: tokens.surface, color: tokens.text }}>
      <p className="eyebrow">COLLEGENOTES{'{11:11}'} · PHASE 3 HARNESS</p>
      <h1 style={{ fontFamily: tokens.fontHeading }}>Continue where you stopped.</h1>
      <p>Botanical Light is the first-launch default. Theme files are local system fonts; no CDN.</p>
      <label>
        Theme
        <select
          value={appearance.theme}
          onChange={(event) => setAppearance((current) => ({ ...current, theme: event.target.value as Appearance['theme'] }))}
        >
          <option value="botanical">Botanical Organic Glass</option>
          <option value="brutalist">Brutalist Glass Lab</option>
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={appearance.mode === 'dark'}
          onChange={(event) => setAppearance((current) => ({ ...current, mode: event.target.checked ? 'dark' : 'light' }))}
        />
        Dark mode
      </label>
      <p>Graphics: {graphics.webgl2 ? 'WebGL2 available' : graphics.fallback}. {textEquivalent('Make the connection')}</p>
      <button type="button" onClick={() => void ping()}>Check local service</button>
      <p role="status">{health}</p>
    </main>
  );
}
