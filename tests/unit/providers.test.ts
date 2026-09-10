import { describe, expect, it } from 'vitest';
import { CAPABILITIES, PROVIDERS, OAuthAttempt, UnavailableCredentialStore, connectionSummary, newConnection, requestEligibility, type ProviderDefinition } from '@collegenotes/providers';
const provider: ProviderDefinition = { ...PROVIDERS[0]!, implementation: 'installed', models: [{ id: 'synthetic', capabilities: ['tutor'] }] };
function ready() {
  const c = newConnection('test', provider, 'Synthetic', 'apiKey');
  c.enabled = true; c.health = 'ready'; c.credential = { store: 'macos-keychain', id: 'opaque-reference' }; c.billing = 'free_allowance'; c.capabilities.tutor = { enabled: true, modelId: 'synthetic' }; return c;
}
describe('provider foundation', () => {
  it('starts every provider disabled without selecting models or credentials', () => {
    expect(PROVIDERS.map((p) => p.id)).toEqual(['openai', 'xai', 'anthropic', 'google']);
    for (const p of PROVIDERS) {
      const c = newConnection('test', p, 'Synthetic', 'apiKey');
      expect(c.enabled).toBe(false); expect(c.credential).toBeNull();
      for (const cap of CAPABILITIES) expect(requestEligibility(p, c, cap, 0).allowed).toBe(false);
    }
  });
  it('rejects unverified account routes and permits documented method selection', () => {
    for (const id of ['xai', 'anthropic']) expect(() => newConnection('test', PROVIDERS.find((p) => p.id === id)!, 'Test', 'oauth')).toThrow('auth_method_unverified');
    for (const id of ['openai', 'google']) expect(newConnection('test', PROVIDERS.find((p) => p.id === id)!, 'Test', 'oauth').enabled).toBe(false);
  });
  it('requires matching provider, enabled connection/capability, health, credentials and model', () => {
    expect(requestEligibility(provider, ready(), 'tutor', 0).allowed).toBe(true);
    for (const change of [{ enabled: false }, { health: 'offline' as const }, { credential: null }, { providerId: 'xai' }, { revocation: 'pending' as const }]) expect(requestEligibility(provider, { ...ready(), ...change }, 'tutor', 0).allowed).toBe(false);
    const c = ready(); c.capabilities.tutor!.enabled = false; expect(requestEligibility(provider, c, 'tutor', 0).reason).toBe('capability_disabled');
    c.capabilities.tutor = { enabled: true, modelId: 'unknown' }; expect(requestEligibility(provider, c, 'tutor', 0).reason).toBe('model_unavailable');
  });
  it('blocks unknown billing and paid calls without a valid ceiling/estimate', () => {
    const c = ready(); c.billing = 'unknown'; expect(requestEligibility(provider, c, 'tutor', 0).allowed).toBe(false);
    c.billing = 'metered_api'; expect(requestEligibility(provider, c, 'tutor', 0).allowed).toBe(false);
    c.usageLimit = { currency: 'USD', ceiling: 1, spent: 0.9 };
    for (const cost of [null, NaN, Infinity, -1, 0.2]) expect(requestEligibility(provider, c, 'tutor', cost).allowed).toBe(false);
    expect(requestEligibility(provider, c, 'tutor', 0.05).allowed).toBe(true);
  });
  it('exports only nonsecret fields even if an adapter adds private properties', () => {
    const raw = { ...ready(), secret: 'synthetic-sensitive-value', token: 'synthetic-token' };
    const out = JSON.stringify(connectionSummary(raw));
    expect(out).not.toContain('synthetic-sensitive-value'); expect(out).not.toContain('synthetic-token'); expect(out).not.toContain('opaque-reference'); expect(out).not.toContain('credential');
  });
  it('fails closed without a production credential store', async () => {
    const store = new UnavailableCredentialStore();
    await expect(store.put()).rejects.toThrow('credential_store_unavailable');
    await expect(store.read()).rejects.toThrow('credential_store_unavailable');
    await expect(store.remove()).rejects.toThrow('credential_store_unavailable');
  });
});
describe('synthetic OAuth callback boundary', () => {
  const redirect = 'http://127.0.0.1:49000/callback';
  const attempt = () => new OAuthAttempt('connection', 'provider', redirect, 200);
  it('binds state, provider, connection and exact redirect and consumes once', () => {
    const a = attempt(); const url = `${redirect}?state=${a.state}&code=synthetic-code`;
    expect(a.challenge).not.toBe(a.verifier); expect(a.verifier.length).toBe(43);
    expect(a.consume(url, 'connection', 'provider', 100)).toEqual({ code: 'synthetic-code', verifier: a.verifier });
    expect(() => a.consume(url, 'connection', 'provider', 100)).toThrow('expired');
  });
  it('rejects invalid callback destinations and binding mismatches', () => {
    for (const redirect of ['https://example.com/callback', 'http://localhost:80/callback', 'http://127.0.0.1:49000/cb?x=1']) expect(() => new OAuthAttempt('c', 'p', redirect, 200)).toThrow('invalid_oauth_redirect');
    const a = attempt();
    for (const url of [`http://127.0.0.1:49001/callback?state=${a.state}&code=x`, `${redirect}/wrong?state=${a.state}&code=x`, `${redirect}?state=wrong&code=x`, `${redirect}?state=${a.state}&state=${a.state}&code=x`]) expect(() => a.consume(url, 'connection', 'provider', 100)).toThrow();
    expect(() => a.consume(`${redirect}?state=${a.state}&code=x`, 'other', 'provider', 100)).toThrow('mismatch');
  });
  it('rejects expiry, cancellation, duplicate codes and provider denial', () => {
    const a = attempt(); expect(() => a.consume(`${redirect}?state=${a.state}&code=x`, 'connection', 'provider', 200)).toThrow('expired');
    const b = attempt(); b.cancel(); expect(() => b.consume(`${redirect}?state=${b.state}&code=x`, 'connection', 'provider', 100)).toThrow('expired');
    for (const query of ['code=x&code=y', 'error=access_denied', 'code=']) {
      const c = attempt(); expect(() => c.consume(`${redirect}?state=${c.state}&${query}`, 'connection', 'provider', 100)).toThrow('failed');
      expect(() => c.consume(`${redirect}?state=${c.state}&code=x`, 'connection', 'provider', 100)).toThrow('expired');
    }
  });
});
