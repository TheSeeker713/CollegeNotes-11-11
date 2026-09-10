export const NAV_DESTINATIONS = ['home', 'courses', 'connections', 'research', 'sources', 'study', 'practice', 'requirements', 'progress', 'settings'] as const;
export type NavId = (typeof NAV_DESTINATIONS)[number];

export type AppRoute =
  | { name: 'home'; courseId: string | null }
  | { name: 'firstuse' }
  | { name: 'sources'; courseId: string }
  | { name: 'study'; courseId: string }
  | { name: 'practice'; courseId: string }
  | { name: 'requirements'; courseId: string }
  | { name: 'progress'; courseId: string }
  | { name: 'settings' }
  | { name: 'courses' }
  | { name: 'connections' }
  | { name: 'research' };

const COURSE_SCREENS = new Set(['sources', 'study', 'practice', 'requirements', 'progress']);

export function parseHash(hash: string, knownCourseIds: string[]): { route: AppRoute; recovered: boolean } {
  const raw = hash.replace(/^#/, '');
  const parts = raw.split('/').filter(Boolean);
  if (parts.length === 0 || (parts.length === 1 && parts[0] === 'home')) {
    return { route: { name: 'home', courseId: knownCourseIds[0] ?? null }, recovered: false };
  }
  if (parts.length === 1 && ['settings', 'courses', 'connections', 'research'].includes(parts[0]!)) return { route: { name: parts[0] as 'settings' | 'courses' | 'connections' | 'research' }, recovered: false };
  if (parts.length === 2 && parts[0] === 'courses' && parts[1] === 'new') return { route: { name: 'firstuse' }, recovered: false };
  if (parts.length <= 3 && parts[0] === 'courses' && parts[1]) {
    const courseId = parts[1];
    const known = knownCourseIds.includes(courseId);
    const screen = parts[2];
    if (!known) return { route: { name: 'home', courseId: knownCourseIds[0] ?? null }, recovered: true };
    if (!screen) return { route: { name: 'home', courseId }, recovered: false };
    if (COURSE_SCREENS.has(screen)) return { route: { name: screen as NavId, courseId } as AppRoute, recovered: false };
  }
  return { route: { name: 'home', courseId: knownCourseIds[0] ?? null }, recovered: true };
}

export function hashFor(route: AppRoute): string {
  if (route.name === 'settings' || route.name === 'courses' || route.name === 'connections' || route.name === 'research') return `#/${route.name}`;
  if (route.name === 'firstuse') return '#/courses/new';
  if (route.name === 'home') return route.courseId ? `#/courses/${route.courseId}` : '#/home';
  return `#/courses/${route.courseId}/${route.name}`;
}
