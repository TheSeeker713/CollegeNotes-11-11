import { describe, expect, it } from 'vitest';
import { hashFor, parseHash } from '@collegenotes/domain';

describe('routes', () => {
  it('parses settings and course screens', () => {
    expect(parseHash('#/settings', []).route.name).toBe('settings');
    expect(parseHash('#/courses/new', []).route.name).toBe('firstuse');
    expect(parseHash('#/courses/crs_1/sources', ['crs_1']).route).toEqual({ name: 'sources', courseId: 'crs_1' });
  });

  it('falls back from invalid hashes without inventing a course', () => {
    const result = parseHash('#/ocean/world', []);
    expect(result.recovered).toBe(true);
    expect(result.route).toEqual({ name: 'home', courseId: null });
  });

  it('round-trips hashes', () => {
    expect(hashFor({ name: 'settings' })).toBe('#/settings');
    expect(hashFor({ name: 'study', courseId: 'c1' })).toBe('#/courses/c1/study');
  });
});

describe('foundation route contracts', () => {
  it('round-trips global foundation routes without inventing a course', () => {
    for (const name of ['courses', 'connections', 'research'] as const) {
      expect(parseHash(hashFor({ name }), []).route).toEqual({ name });
    }
  });
});
