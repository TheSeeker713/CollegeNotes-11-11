export type ProviderKind = 'tutor' | 'narration' | 'recognition';
export type ProviderState =
  | { available: false; reason: 'not_configured' | 'offline' | 'unauthorized'; kind: ProviderKind }
  | { available: true; kind: ProviderKind; simulated: true };

export function providerStatus(kind: ProviderKind): ProviderState {
  return { available: false, reason: 'not_configured', kind };
}

export function describeUnavailable(kind: ProviderKind): string {
  const state = providerStatus(kind);
  if (state.available) return `${kind} available (simulated)`;
  return `${kind} unavailable: ${state.reason}. No silent fallback.`;
}

export * from './contracts.js';
export { OAuthAttempt } from './oauth.js';
