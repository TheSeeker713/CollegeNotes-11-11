export const SCHEMA_VERSION = 1 as const;

export type { ThemeId, ModeId, DensityId, Appearance } from './appearance.js';
export { DEFAULT_APPEARANCE, THEME_VARIANTS, parseAppearance } from './appearance.js';
export { createId } from './ids.js';
export { NAV_DESTINATIONS, parseHash, hashFor, type AppRoute, type NavId } from './routes.js';
export {
  CARD_IDS,
  DEFAULT_CARD_LAYOUT,
  parseCardLayout,
  startMove,
  nudge,
  cancelMove,
  togglePin,
  type CardId,
  type CardLayout,
  type MoveSession
} from './cards.js';
export { newCourse, type Course, type SourceDocument, type Job, type JobStatus, type SessionState, type Draft } from './entities.js';

export type Health = {
  ok: true;
  service: 'collegenotes-local';
  sqlite: 'ok' | 'unavailable';
  fts5: boolean;
};
