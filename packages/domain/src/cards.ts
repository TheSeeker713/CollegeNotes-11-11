export const CARD_IDS = ['source', 'notes', 'study', 'listen'] as const;
export type CardId = (typeof CARD_IDS)[number];

export type CardLayout = {
  order: CardId[];
  pinned: CardId[];
};

export const DEFAULT_CARD_LAYOUT: CardLayout = {
  order: [...CARD_IDS],
  pinned: []
};

export function parseCardLayout(value: unknown): CardLayout {
  if (!value || typeof value !== 'object') return { ...DEFAULT_CARD_LAYOUT, order: [...CARD_IDS], pinned: [] };
  const record = value as { order?: unknown; pinned?: unknown };
  const order = Array.isArray(record.order)
    ? record.order.filter((id): id is CardId => CARD_IDS.includes(id as CardId))
    : [];
  for (const id of CARD_IDS) if (!order.includes(id)) order.push(id);
  const pinned = Array.isArray(record.pinned)
    ? record.pinned.filter((id): id is CardId => CARD_IDS.includes(id as CardId))
    : [];
  return { order, pinned };
}

export type MoveSession = { card: CardId; origin: CardLayout };

export function startMove(layout: CardLayout, card: CardId): MoveSession | null {
  if (layout.pinned.includes(card)) return null;
  return { card, origin: { order: [...layout.order], pinned: [...layout.pinned] } };
}

export function nudge(layout: CardLayout, card: CardId, direction: -1 | 1): CardLayout {
  if (layout.pinned.includes(card)) return layout;
  const order = [...layout.order];
  const index = order.indexOf(card);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= order.length) return layout;
  const swap = order[next];
  if (swap && layout.pinned.includes(swap)) return layout;
  const current = order[index];
  if (!current || !swap) return layout;
  order[index] = swap;
  order[next] = current;
  return { ...layout, order };
}

export function cancelMove(session: MoveSession): CardLayout {
  return { order: [...session.origin.order], pinned: [...session.origin.pinned] };
}

export function togglePin(layout: CardLayout, card: CardId): CardLayout {
  const pinned = layout.pinned.includes(card)
    ? layout.pinned.filter((id) => id !== card)
    : [...layout.pinned, card];
  return { ...layout, pinned };
}
