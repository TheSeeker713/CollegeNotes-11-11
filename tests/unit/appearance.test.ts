import { describe, expect, it } from 'vitest';
import { DEFAULT_APPEARANCE, THEME_VARIANTS, parseAppearance } from '@collegenotes/domain';
import { LOCAL_FONTS, VARIANTS, tokensFor, variantKey } from '@collegenotes/ui';

describe('appearance fixtures', () => {
  it('defaults to botanical light regardless of a dark-looking payload', () => {
    expect(parseAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance({ theme: 'unknown', mode: 'darkish' })).toEqual(DEFAULT_APPEARANCE);
  });

  it.each(THEME_VARIANTS)('has tokens for %s', (key) => {
    expect(VARIANTS[key].text).toMatch(/^#/);
    expect(VARIANTS[key].fontUi).toContain('system-ui');
  });

  it('saved preference keeps independent theme and mode', () => {
    const saved = parseAppearance({ theme: 'brutalist', mode: 'dark' });
    expect(variantKey(saved)).toBe('brutalist-dark');
    expect(tokensFor(saved).canvas).toBe('#111316');
  });

  it('uses only local fonts', () => {
    expect(LOCAL_FONTS.every((font) => !font.includes('http'))).toBe(true);
    expect(JSON.stringify(VARIANTS).includes('fonts.google')).toBe(false);
  });
});
