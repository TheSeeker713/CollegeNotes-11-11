import { DEFAULT_APPEARANCE, parseAppearance, type Appearance } from '@collegenotes/domain';

export const APPEARANCE_KEY = 'collegenotes-appearance';

export function readStoredAppearance(): Appearance {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_APPEARANCE };
  try {
    return parseAppearance(JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? 'null'));
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function applyAppearance(appearance: Appearance, persist = true): void {
  const parsed = parseAppearance(appearance);
  const root = document.documentElement;
  root.dataset.theme = parsed.theme;
  root.dataset.mode = parsed.mode;
  root.dataset.density = parsed.density;
  root.classList.toggle('reduce-motion', parsed.reduceMotion);
  root.classList.toggle('reduce-transparency', parsed.reduceTransparency);
  if (persist && typeof localStorage !== 'undefined') {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(parsed));
  }
}
