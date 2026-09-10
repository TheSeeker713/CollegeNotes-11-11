import { describe, expect, it } from 'vitest';

describe('synthetic evaluation fixture', () => {
  it('labels this case as a synthetic rubric, not a live tutor eval', () => {
    const result = { synthetic: true, rubric: 'phase-3-harness', score: null };
    expect(result.synthetic).toBe(true);
    expect(result.score).toBeNull();
  });
});
