import { CAPABILITIES, connectionSummary, type Capability, type Connection, type ProviderDefinition } from '@collegenotes/providers';
import type { Derivative, Material, ResearchSession, SessionState } from '@collegenotes/domain';
import { hashFor, parseHash } from '@collegenotes/domain';
import { listCourses } from './repos.js';
import type { Store } from './database.js';

export function listMaterials(store: Store, courseId: string): Material[] {
  if (!listCourses(store).some((course) => course.id === courseId)) return [];
  return store.db.prepare(`select id, course_id as courseId, filename, checksum, byte_length as byteLength,
    stored_rel_path as storedRelPath, created_at as createdAt, updated_at as updatedAt, kind, revision,
    trashed_at as trashedAt, deleted_at as deletedAt, cleanup_state as cleanupState from source_documents
    where course_id=? and trashed_at is null and deleted_at is null and cleanup_state='none'`).all(courseId) as Material[];
}
export function eligibleDerivatives(store: Store, courseId: string, modelVersion?: string): Derivative[] {
  return store.db.prepare(`select d.id, d.course_id as courseId, d.source_id as sourceId, d.source_revision as sourceRevision, d.kind, d.status, d.model_version as modelVersion
    from derivatives d join source_documents s on s.id=d.source_id and s.course_id=d.course_id
    join courses c on c.id=d.course_id where d.course_id=? and d.status='ready' and d.source_revision=s.revision
    and s.trashed_at is null and s.deleted_at is null and s.cleanup_state='none'
    and c.archived_at is null and c.trashed_at is null and (d.kind!='embedding' or d.model_version=?)`).all(courseId, modelVersion ?? null) as Derivative[];
}
export function saveProviderDefinition(store: Store, definition: ProviderDefinition): void {
  if (!/^[a-z][a-z0-9_-]{0,63}$/.test(definition.id) || !definition.label.trim() || definition.capabilities.some((c) => !CAPABILITIES.includes(c))) throw new Error('invalid_provider');
  const safe = { id: definition.id, label: definition.label, capabilities: [...definition.capabilities],
    auth: definition.auth.map((a) => ({ method: a.method, evidence: a.evidence, documentationUrl: a.documentationUrl })),
    dataPolicyUrl: definition.dataPolicyUrl, models: definition.models.map((m) => ({ id: m.id, capabilities: [...m.capabilities] })), implementation: definition.implementation };
  store.db.prepare('insert into provider_definitions(id,payload) values (?,?) on conflict(id) do update set payload=excluded.payload').run(definition.id, JSON.stringify(safe));
}
export function listProviderDefinitions(store: Store): Array<ProviderDefinition & { enabled: boolean }> {
  return (store.db.prepare('select payload,enabled from provider_definitions order by id').all() as { payload: string; enabled: number }[]).map((r) => ({ ...JSON.parse(r.payload) as ProviderDefinition, enabled: r.enabled === 1 }));
}
export function saveConnection(store: Store, connection: Connection): void {
  const provider = listProviderDefinitions(store).find((p) => p.id === connection.providerId);
  if (!provider || !provider.auth.some((a) => a.method === connection.authMethod && a.evidence === 'verified_documentation') || connection.schemaVersion !== 1 || !connection.id || !connection.label.trim()) throw new Error('invalid_connection');
  if (connection.enabled && !provider.enabled) throw new Error('provider_disabled');
  if (Object.keys(connection.capabilities).some((c) => !provider.capabilities.includes(c as Capability))) throw new Error('unsupported_capability');
  if (connection.credential && (connection.credential.store !== 'macos-keychain' || !connection.credential.id)) throw new Error('invalid_credential_reference');
  const old = getConnection(store, connection.id);
  if (old && old.providerId !== connection.providerId) throw new Error('connection_provider_immutable');
  const payload = JSON.stringify(connectionSummary(connection));
  store.db.transaction(() => {
    store.db.prepare('insert into connections(id,provider_id,payload) values (?,?,?) on conflict(id) do update set payload=excluded.payload').run(connection.id, connection.providerId, payload);
    if (connection.credential) store.db.prepare('insert into credential_references(connection_id,store,reference_id) values (?,?,?) on conflict(connection_id) do update set store=excluded.store,reference_id=excluded.reference_id').run(connection.id, connection.credential.store, connection.credential.id);
    else store.db.prepare('delete from credential_references where connection_id=?').run(connection.id);
    if (!connection.enabled || connection.health !== 'ready') store.db.prepare('delete from capability_assignments where connection_id=?').run(connection.id);
    else for (const capability of CAPABILITIES) {
      const setting = connection.capabilities[capability];
      if (!setting?.enabled) store.db.prepare('delete from capability_assignments where connection_id=? and capability=?').run(connection.id, capability);
      else store.db.prepare('delete from capability_assignments where connection_id=? and capability=? and model_id!=?').run(connection.id, capability, setting.modelId ?? '');
    }
  })();
}
export function getConnection(store: Store, id: string): Connection | null {
  const row = store.db.prepare('select payload from connections where id=?').get(id) as { payload: string } | undefined;
  if (!row) return null;
  const c = JSON.parse(row.payload) as Connection;
  const ref = store.db.prepare('select store,reference_id as id from credential_references where connection_id=?').get(id) as Connection['credential'];
  return { ...c, credential: ref ?? null };
}
export function listConnections(store: Store): Connection[] {
  return (store.db.prepare('select id from connections order by id').all() as { id: string }[]).map(({ id }) => getConnection(store, id)!);
}
export function assignCapability(store: Store, capability: Capability, connectionId: string, modelId: string): void {
  const c = getConnection(store, connectionId);
  const p = listProviderDefinitions(store).find((item) => item.id === c?.providerId);
  if (!p?.enabled || !CAPABILITIES.includes(capability) || !c?.enabled || c.health !== 'ready' || !c.credential || !c.capabilities[capability]?.enabled || c.capabilities[capability]?.modelId !== modelId || !p?.models.some((m) => m.id === modelId && m.capabilities.includes(capability))) throw new Error('capability_unavailable');
  store.db.prepare('insert into capability_assignments(capability,connection_id,model_id) values (?,?,?) on conflict(capability) do update set connection_id=excluded.connection_id,model_id=excluded.model_id').run(capability, connectionId, modelId);
}
export function deleteConnectionConfiguration(store: Store, id: string): void {
  if (getConnection(store, id)?.credential) throw new Error('credential_cleanup_required');
  store.db.prepare('delete from connections where id=?').run(id);
}
export function setProviderEnabled(store: Store, id: string, enabled: boolean): void {
  if (!listProviderDefinitions(store).some((p) => p.id === id)) throw new Error('unknown_provider');
  store.db.transaction(() => {
    if (!enabled) for (const c of listConnections(store).filter((c) => c.providerId === id)) saveConnection(store, { ...c, enabled: false });
    store.db.prepare('update provider_definitions set enabled=? where id=?').run(enabled ? 1 : 0, id);
  })();
}
export function deleteProviderDefinition(store: Store, id: string): void {
  // Foreign keys prevent deleting definitions with connections still requiring cleanup.
  store.db.prepare('delete from provider_definitions where id=?').run(id);
}
export function exportConnectionSettings(store: Store) {
  return { schemaVersion: 1, providers: listProviderDefinitions(store).map((p) => ({ id: p.id, label: p.label, enabled: p.enabled })), connections: listConnections(store).map(connectionSummary),
    assignments: store.db.prepare('select capability,connection_id as connectionId,model_id as modelId from capability_assignments').all() };
}
export function listResearchSessions(store: Store, courseId: string): ResearchSession[] {
  if (!listCourses(store).some((c) => c.id === courseId)) return [];
  return (store.db.prepare(`select id, course_id as courseId, provider_id as providerId, connection_id as connectionId, query, created_at as createdAt,
    initiated_by as initiatedBy, shared_context as sharedContext, status, deleted_at as deletedAt from research_sessions where course_id=? and deleted_at is null`).all(courseId) as Array<Omit<ResearchSession, 'sharedContext'> & { sharedContext: string }>).map((r) => ({ ...r, sharedContext: JSON.parse(r.sharedContext) as ResearchSession['sharedContext'] }));
}
export function recoverSession(store: Store, value: unknown): SessionState {
  const fallback: SessionState = { courseId: null, routeHash: '#/home', task: 'home', notice: 'Saved location could not be restored. Your local data is preserved.' };
  if (!value || typeof value !== 'object' || !('routeHash' in value) || typeof value.routeHash !== 'string') return fallback;
  const parsed = parseHash(value.routeHash, listCourses(store).map((c) => c.id));
  return { courseId: 'courseId' in parsed.route ? parsed.route.courseId : null, routeHash: hashFor(parsed.route), task: parsed.route.name,
    notice: parsed.recovered ? fallback.notice : null };
}
