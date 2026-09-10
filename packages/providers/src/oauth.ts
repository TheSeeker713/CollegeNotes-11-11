import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Generic local callback harness only: no HTTP server, account login or token exchange. */
export class OAuthAttempt {
  readonly state = randomBytes(32).toString('base64url');
  readonly verifier = randomBytes(32).toString('base64url');
  readonly challenge = createHash('sha256').update(this.verifier).digest('base64url');
  private consumed = false;
  private readonly redirect: URL;
  constructor(readonly connectionId: string, readonly providerId: string, redirectUri: string, private readonly expiresAt: number) {
    this.redirect = new URL(redirectUri);
    if (this.redirect.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(this.redirect.hostname) || !this.redirect.port || this.redirect.username || this.redirect.password || this.redirect.search || this.redirect.hash || !connectionId || !providerId || !Number.isFinite(expiresAt)) throw new Error('invalid_oauth_redirect');
  }
  cancel() { this.consumed = true; }
  consume(callback: string, connectionId: string, providerId: string, now = Date.now()): { code: string; verifier: string } {
    if (this.consumed || now >= this.expiresAt) throw new Error('oauth_attempt_expired');
    const url = new URL(callback);
    if (connectionId !== this.connectionId || providerId !== this.providerId || url.origin !== this.redirect.origin || url.pathname !== this.redirect.pathname || url.username || url.password || url.hash) throw new Error('oauth_callback_mismatch');
    const states = url.searchParams.getAll('state');
    const state = Buffer.from(states[0] ?? '');
    const expected = Buffer.from(this.state);
    if (states.length !== 1 || state.length !== expected.length || !timingSafeEqual(state, expected)) throw new Error('oauth_state_mismatch');
    this.consumed = true;
    const codes = url.searchParams.getAll('code');
    if (url.searchParams.has('error') || codes.length !== 1 || !codes[0]?.trim()) throw new Error('oauth_authorization_failed');
    return { code: codes[0], verifier: this.verifier };
  }
}
