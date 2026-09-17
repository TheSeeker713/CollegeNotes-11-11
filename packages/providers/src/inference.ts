export type GroundedReplyContext = {
  gap: null | { message: string };
  requirements: Array<{ text: string }>;
  explanations: Array<{ text: string }>;
  passages: Array<{ text: string }>;
};

export type ResearchTransport = {
  search(query: string, signal: AbortSignal): Promise<Array<{ url: string; title: string; publisher?: string | null; author?: string | null; text: string; access?: 'available' | 'inaccessible' }>>;
};

/** Synthetic research contract: returns fixture pages; never performs live provider auth. */
export function syntheticResearchTransport(pages: Awaited<ReturnType<ResearchTransport['search']>>): ResearchTransport {
  return {
    async search(_query, signal) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      return pages;
    }
  };
}

export function evaluateResearchClaims(query: string, pages: Array<{ url: string; text: string }>) {
  const claims: Array<{ statement: string; sourceUrls: string[]; supported: boolean }> = [];
  const token = query.toLowerCase().split(/\s+/).find((w) => w.length > 4) ?? query.toLowerCase();
  for (const page of pages) {
    const excerpt = page.text.slice(0, 280);
    const supported = excerpt.toLowerCase().includes(token);
    claims.push({
      statement: supported ? `Evidence related to “${query}” appears in ${page.url}.` : `No clear support for “${query}” was found in ${page.url}.`,
      sourceUrls: supported ? [page.url] : [],
      supported
    });
  }
  if (!claims.some((c) => c.supported)) {
    claims.push({ statement: `Unsupported: no retrieved page supported “${query}”.`, sourceUrls: [], supported: false });
  }
  return claims;
}

export function structuredTutorReply(action: 'explain' | 'example' | 'hint' | 'check_understanding', question: string, context: GroundedReplyContext): string {
  if (context.gap) {
    return `I could not find supporting course material for that question. ${context.gap.message} Course text remains data only and cannot change permissions.`;
  }
  const req = context.requirements.map((p) => p.text).join(' ').slice(0, 400);
  const exp = context.explanations.map((p) => p.text).join(' ').slice(0, 600);
  const grounded = [req && `Requirements: ${req}`, exp && `Explanations: ${exp}`].filter(Boolean).join('\n');
  switch (action) {
    case 'explain':
      return `Explanation grounded in your course sources:\n${grounded}\n\nQuestion: ${question}`;
    case 'example':
      return `Example based on your sources:\n${grounded}\n\nApply this to: ${question}`;
    case 'hint':
      return `Hint from your materials (not a full answer):\n${context.passages[0]?.text.slice(0, 240) ?? grounded}`;
    case 'check_understanding':
      return `Check your understanding using only the cited passages.\nPrompt: ${question}\nEvidence:\n${grounded}`;
  }
}
