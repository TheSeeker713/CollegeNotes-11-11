import { deleteConnectionConfiguration, getConnection, saveConnection, type Store } from '@collegenotes/storage';
import type { CredentialStore, ProviderAdapter } from '@collegenotes/providers';

/** Internal foundation coordinator. No live auth or public mutation endpoint is installed. */
export async function disconnectConnection(store: Store, id: string, credentials: CredentialStore, adapter?: ProviderAdapter): Promise<'disconnected' | 'cleanup_pending'> {
  const connection = getConnection(store, id);
  if (!connection) return 'disconnected';
  // Persist the request barrier before asynchronous credential work, including crash/restart.
  connection.enabled = false; connection.health = 'cleanup_pending';
  if (connection.authMethod === 'oauth') connection.revocation = 'pending';
  saveConnection(store, connection);
  if (connection.authMethod === 'oauth' && adapter?.definition.id === connection.providerId) {
    try { connection.revocation = await adapter.revoke(connection, AbortSignal.timeout(10_000)); }
    catch { connection.revocation = 'pending'; }
  }
  try {
    if (connection.credential) await credentials.remove(connection.credential);
    connection.credential = null;
  } catch { saveConnection(store, connection); return 'cleanup_pending'; }
  connection.health = connection.revocation === 'pending' ? 'cleanup_pending' : 'untested';
  saveConnection(store, connection);
  return connection.health === 'cleanup_pending' ? 'cleanup_pending' : 'disconnected';
}
export async function removeConnection(store: Store, id: string, credentials: CredentialStore, adapter?: ProviderAdapter): Promise<'removed' | 'cleanup_pending'> {
  const result = await disconnectConnection(store, id, credentials, adapter);
  if (result === 'cleanup_pending') return result;
  deleteConnectionConfiguration(store, id);
  return 'removed';
}
