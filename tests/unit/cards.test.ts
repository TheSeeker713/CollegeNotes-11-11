import { describe, expect, it } from 'vitest';
import { DEFAULT_CARD_LAYOUT, cancelMove, nudge, startMove, togglePin } from '@collegenotes/domain';

describe('card layout', () => {
  it('moves with arrows and restores on cancel', () => {
    const session = startMove(DEFAULT_CARD_LAYOUT, 'notes');
    expect(session).not.toBeNull();
    const moved = nudge(DEFAULT_CARD_LAYOUT, 'notes', -1);
    expect(moved.order[0]).toBe('notes');
    expect(cancelMove(session!)).toEqual(DEFAULT_CARD_LAYOUT);
  });

  it('does not move pinned cards', () => {
    const pinned = togglePin(DEFAULT_CARD_LAYOUT, 'source');
    expect(startMove(pinned, 'source')).toBeNull();
    expect(nudge(pinned, 'source', 1).order).toEqual(DEFAULT_CARD_LAYOUT.order);
  });
});
