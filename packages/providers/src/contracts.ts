export const CAPABILITIES = ['tutor', 'research', 'embeddings', 'narration', 'transcription', 'realtimeVoice'] as const;
export type Capability = (typeof CAPABILITIES)[number];
export type AuthMethod = 'apiKey' | 'oauth';
export type AuthEvidence = 'verified_documentation' | 'unverified' | 'experimental' | 'unavailable';
export type ProviderDefinition = {
  id: string; label: string; capabilities: readonly Capability[];
  auth: ReadonlyArray<{ method: AuthMethod; evidence: AuthEvidence; documentationUrl: string }>;
  dataPolicyUrl: string; models: ReadonlyArray<{ id: string; capabilities: readonly Capability[] }>;
  implementation: 'not_implemented' | 'installed';
};
export type CredentialReference = { store: 'macos-keychain'; id: string };
/** Server-only boundary. No production implementation or secret persistence is supplied in this phase. */
export interface CredentialStore {
  put(connectionId: string, secret: string): Promise<CredentialReference>;
  read(reference: CredentialReference): Promise<string | null>;
  remove(reference: CredentialReference): Promise<void>;
}
export type Connection = {
  schemaVersion: 1; id: string; providerId: string; label: string; authMethod: AuthMethod;
  credential: CredentialReference | null; enabled: boolean;
  capabilities: Partial<Record<Capability, { enabled: boolean; modelId: string | null }>>;
  health: 'untested' | 'ready' | 'offline' | 'unauthorized' | 'cleanup_pending';
  billing: 'unknown' | 'subscription' | 'free_allowance' | 'metered_api';
  usageLimit: { currency: 'USD'; ceiling: number; spent: number } | null;
  revocation: 'not_requested' | 'pending' | 'complete' | 'unsupported';
};
export type CapabilityAssignment = { capability: Capability; connectionId: string; modelId: string };
export interface ProviderAdapter {
  definition: ProviderDefinition;
  test(connection: Connection, signal: AbortSignal): Promise<'ready' | 'unauthorized' | 'offline'>;
  revoke(connection: Connection, signal: AbortSignal): Promise<'complete' | 'unsupported'>;
}
export class UnavailableCredentialStore implements CredentialStore {
  async put(): Promise<CredentialReference> { throw new Error('credential_store_unavailable'); }
  async read(): Promise<string | null> { throw new Error('credential_store_unavailable'); }
  async remove(): Promise<void> { throw new Error('credential_store_unavailable'); }
}

export const PROVIDERS: readonly ProviderDefinition[] = [
  { id: 'openai', label: 'OpenAI / ChatGPT', capabilities: ['tutor', 'research', 'narration', 'transcription', 'realtimeVoice'], auth: [
    { method: 'apiKey', evidence: 'verified_documentation', documentationUrl: 'https://learn.chatgpt.com/docs/app-server' },
    { method: 'oauth', evidence: 'verified_documentation', documentationUrl: 'https://learn.chatgpt.com/docs/app-server' }
  ], dataPolicyUrl: 'https://developers.openai.com/api/docs/guides/your-data', models: [], implementation: 'not_implemented' },
  { id: 'xai', label: 'xAI / Grok', capabilities: ['tutor', 'research'], auth: [
    { method: 'apiKey', evidence: 'verified_documentation', documentationUrl: 'https://docs.x.ai/developers/rest-api-reference/inference' },
    { method: 'oauth', evidence: 'unverified', documentationUrl: 'https://docs.x.ai/build/enterprise' }
  ], dataPolicyUrl: 'https://x.ai/legal/privacy-policy', models: [], implementation: 'not_implemented' },
  { id: 'anthropic', label: 'Anthropic / Claude', capabilities: ['tutor', 'research'], auth: [
    { method: 'apiKey', evidence: 'verified_documentation', documentationUrl: 'https://platform.claude.com/docs/en/api/overview' },
    { method: 'oauth', evidence: 'unverified', documentationUrl: 'https://code.claude.com/docs/en/getting-started' }
  ], dataPolicyUrl: 'https://privacy.claude.com/', models: [], implementation: 'not_implemented' },
  { id: 'google', label: 'Google / Gemini', capabilities: ['tutor', 'research', 'narration', 'transcription', 'realtimeVoice'], auth: [
    { method: 'apiKey', evidence: 'verified_documentation', documentationUrl: 'https://ai.google.dev/gemini-api/docs/api-key' },
    { method: 'oauth', evidence: 'verified_documentation', documentationUrl: 'https://ai.google.dev/gemini-api/docs/oauth' }
  ], dataPolicyUrl: 'https://ai.google.dev/gemini-api/terms', models: [], implementation: 'not_implemented' }
];

export function newConnection(id: string, provider: ProviderDefinition, label: string, method: AuthMethod): Connection {
  if (!id.trim() || !label.trim()) throw new Error('connection_label_required');
  if (!provider.auth.some((auth) => auth.method === method && auth.evidence === 'verified_documentation')) throw new Error('auth_method_unverified');
  return { schemaVersion: 1, id, providerId: provider.id, label: label.trim(), authMethod: method, credential: null, enabled: false,
    capabilities: Object.fromEntries(provider.capabilities.map((capability) => [capability, { enabled: false, modelId: null }])),
    health: 'untested', billing: 'unknown', usageLimit: null, revocation: 'not_requested' };
}
/** Explicit allowlist: browser/export consumers never receive opaque credential references. */
export function connectionSummary(connection: Connection) {
  return { schemaVersion: 1 as const, id: connection.id, providerId: connection.providerId, label: connection.label,
    authMethod: connection.authMethod, enabled: connection.enabled,
    capabilities: Object.fromEntries(CAPABILITIES.flatMap((key) => {
      const value = connection.capabilities[key];
      return value ? [[key, { enabled: value.enabled, modelId: value.modelId }]] : [];
    })), health: connection.health, billing: connection.billing,
    usageLimit: connection.usageLimit ? { currency: connection.usageLimit.currency, ceiling: connection.usageLimit.ceiling, spent: connection.usageLimit.spent } : null,
    revocation: connection.revocation };
}
export function requestEligibility(provider: ProviderDefinition, connection: Connection, capability: Capability, estimatedCost: number | null): { allowed: boolean; reason: string } {
  const deny = (reason: string) => ({ allowed: false, reason });
  if (provider.id !== connection.providerId || provider.implementation !== 'installed') return deny('adapter_unavailable');
  if (!provider.auth.some((auth) => auth.method === connection.authMethod && auth.evidence === 'verified_documentation')) return deny('auth_method_unverified');
  if (!connection.enabled || connection.health !== 'ready' || !connection.credential || connection.revocation === 'pending') return deny('connection_unavailable');
  const setting = connection.capabilities[capability];
  if (!provider.capabilities.includes(capability) || !setting?.enabled) return deny('capability_disabled');
  if (!provider.models.some((model) => model.id === setting.modelId && model.capabilities.includes(capability))) return deny('model_unavailable');
  if (connection.billing === 'unknown') return deny('billing_unknown');
  if (connection.billing === 'metered_api') {
    const limit = connection.usageLimit;
    if (!limit || estimatedCost === null || !Number.isFinite(estimatedCost) || estimatedCost < 0 || !Number.isFinite(limit.ceiling) || !Number.isFinite(limit.spent) || limit.ceiling < 0 || limit.spent < 0 || limit.spent + estimatedCost > limit.ceiling) return deny('usage_limit');
  }
  return { allowed: true, reason: 'explicit_connection_ready' };
}
