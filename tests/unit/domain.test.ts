import { describe, expect, it } from 'vitest';
import { DEFAULT_APPEARANCE, SCHEMA_VERSION, parseAppearance } from '@collegenotes/domain';
import { newAttempt } from '@collegenotes/learning';
import { detectGraphics, textEquivalent } from '@collegenotes/visuals';

describe('domain harness', () => {
  it('keeps schema version and attempts', () => {
    expect(SCHEMA_VERSION).toBe(1);
    expect(newAttempt('act-1').submitted).toBe(false);
  });

  it('graphics fallback does not require a GPU', () => {
    expect(detectGraphics(null)).toEqual({ webgl2: false, fallback: 'text-2d' });
    expect(textEquivalent('Make the connection')).toContain('Make the connection');
  });

  it('rejects invented appearance keys', () => {
    expect(parseAppearance({ theme: 'neo', mode: 'auto' })).toEqual(DEFAULT_APPEARANCE);
  });
});
