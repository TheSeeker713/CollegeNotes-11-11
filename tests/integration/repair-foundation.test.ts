import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { assignCapability, createCourse, deleteProviderDefinition, eligibleDerivatives, exportConnectionSettings, getConnection, getSession, listConnections, listCourses, listMaterials, listResearchSessions, migrate, openStore, readOriginal, saveConnection, saveProviderDefinition, setProviderEnabled, setDraft, storeOriginal, type Store } from '@collegenotes/storage';
import { PROVIDERS, newConnection, type CredentialStore, type ProviderAdapter } from '@collegenotes/providers';
import { MIGRATIONS } from '../../packages/storage/src/migrations.ts';
import { removeConnection } from '../../apps/local-service/src/connections.ts';
import { createService } from '../../apps/local-service/src/index.ts';
const stores: Store[] = [];
const dirs: string[] = [];
function tmp() { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cn-repair-')); dirs.push(dir); return dir; }
function open(dir = tmp()) { const s = openStore(dir); stores.push(s); return s; }
afterEach(() => { for (const s of stores.splice(0)) if (s.db.open) s.db.close(); for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });
function legacy(dir: string) {
  fs.mkdirSync(path.join(dir, 'originals'));
  const db = new Database(path.join(dir, 'collegenotes.sqlite'));
  // Freeze the existing eight-migration baseline; the repair must only append migration nine.
  for (let i = 0; i < 8; i++) { db.exec(MIGRATIONS[i]!); db.prepare('insert into schema_migrations values (?,?)').run(i + 1, 'baseline'); }
  db.prepare('insert into courses values (?,?,?)').run('legacy-course', 'Synthetic legacy course', '2026-01-01');
  db.prepare('insert into source_documents values (?,?,?,?,?,?,?)').run('legacy-source', 'legacy-course', 'original.txt', 'synthetic-checksum', 13, 'originals/original.txt', '2026-01-01');
  fs.writeFileSync(path.join(dir, 'originals/original.txt'), 'original-text');
  db.prepare('insert into drafts values (?,?,?,?)').run('note:legacy-course', 'legacy-course', 'Keep my writing', '2026-01-01');
  db.prepare('insert into sessions values (1,?)').run(JSON.stringify({ courseId: 'legacy-course', routeHash: '#/courses/legacy-course/study', task: 'study', notice: null }));
  return db;
}
describe('Phase 4 forward-only foundation migration', () => {
  it('starts empty with no mandatory provider or seeded learning data', () => {
    const s = open(); expect(listCourses(s)).toEqual([]); expect(listConnections(s)).toEqual([]);
    expect(s.db.prepare('select count(*) as n from provider_definitions').get()).toEqual({ n: 0 });
    expect(s.db.prepare('select count(*) as n from source_documents').get()).toEqual({ n: 0 });
    expect(migrate(s.db)).toBe(MIGRATIONS.length);
  });
  it('upgrades actual v8 tables without altering IDs, originals, writing or session', () => {
    const dir = tmp(); const db = legacy(dir); db.close();
    const s = open(dir); expect(migrate(s.db)).toBe(MIGRATIONS.length);
    expect(listCourses(s)[0]).toEqual({ id: 'legacy-course', name: 'Synthetic legacy course', description: '', createdAt: '2026-01-01', updatedAt: '2026-01-01', archivedAt: null, trashedAt: null });
    const material = listMaterials(s, 'legacy-course')[0]!;
    expect(material).toMatchObject({ id: 'legacy-source', revision: 1, cleanupState: 'none', trashedAt: null, deletedAt: null, checksum: 'synthetic-checksum' });
    expect(readOriginal(s, material).toString()).toBe('original-text');
    expect(s.db.prepare('select body from drafts').get()).toEqual({ body: 'Keep my writing' });
    expect(getSession(s).routeHash).toBe('#/courses/legacy-course/study');
    s.db.close(); const again = open(dir); expect(listMaterials(again, 'legacy-course')).toEqual([material]);
  });
  it('rolls back all v9 DDL and data changes when migration fails', () => {
    const dir = tmp(); const db = legacy(dir); db.exec('create table course_modules (conflict text)');
    expect(() => migrate(db)).toThrow();
    expect(db.prepare('select max(version) as v from schema_migrations').get()).toEqual({ v: 8 });
    expect((db.pragma('table_info(courses)') as { name: string }[]).map((c) => c.name)).toEqual(['id', 'name', 'created_at']);
    expect(db.prepare('select name from courses').get()).toEqual({ name: 'Synthetic legacy course' }); db.close();
  });
  it('rejects unsupported future schemas without erasing their records', () => {
    const s = open(); s.db.prepare('insert into schema_migrations values (?,?)').run(MIGRATIONS.length + 1, 'future');
    expect(() => migrate(s.db)).toThrow('unsupported_schema');
    expect(s.db.prepare('select max(version) as v from schema_migrations').get()).toEqual({ v: MIGRATIONS.length + 1 });
  });
});
describe('source and derivative ownership foundation', () => {
  it('rejects cross-course relationships and excludes stale/deleted/wrong-model context', () => {
    const s = open(); const a = createCourse(s, 'Synthetic A'); const b = createCourse(s, 'Synthetic B');
    const src = storeOriginal(s, a.id, 'original.txt', Buffer.from('unchanged'));
    const insert = s.db.prepare('insert into derivatives values (?,?,?,?,?,?,?)');
    expect(() => insert.run('cross', b.id, src.id, 1, 'lexical', 'ready', null)).toThrow();
    insert.run('lexical', a.id, src.id, 1, 'lexical', 'ready', null);
    insert.run('vector', a.id, src.id, 1, 'embedding', 'ready', 'model-1');
    expect(eligibleDerivatives(s, b.id, 'model-1')).toEqual([]);
    expect(eligibleDerivatives(s, a.id, 'model-2').map((d) => d.id)).toEqual(['lexical']);
    expect(eligibleDerivatives(s, a.id, 'model-1')).toHaveLength(2);
    s.db.prepare("update source_documents set revision=2 where id=?").run(src.id);
    expect(eligibleDerivatives(s, a.id, 'model-1')).toEqual([]);
    s.db.prepare("update derivatives set status='ready',source_revision=2").run();
    s.db.prepare("update source_documents set trashed_at='now' where id=?").run(src.id);
    expect(listMaterials(s, a.id)).toEqual([]); expect(eligibleDerivatives(s, a.id, 'model-1')).toEqual([]);
    expect(readOriginal(s, src).toString()).toBe('unchanged');
  });
  it('invalidates indexes after source/model changes and excludes archived courses', () => {
    const s = open(); const c = createCourse(s, 'Synthetic'); const src = storeOriginal(s, c.id, 'x.txt', Buffer.from('x'));
    s.db.prepare('insert into embedding_indexes values (?,?,?,?,?,?,?,?)').run('idx', c.id, 'model', '1', 'hash', 'ready', JSON.stringify({ [src.id]: 1 }), null);
    s.db.prepare("update source_documents set deleted_at='now' where id=?").run(src.id);
    expect(s.db.prepare('select status,rebuild_reason from embedding_indexes').get()).toEqual({ status: 'stale', rebuild_reason: 'source_changed' });
    s.db.prepare("update embedding_indexes set model_version='2',status='ready'").run();
    expect(s.db.prepare('select status,rebuild_reason from embedding_indexes').get()).toEqual({ status: 'stale', rebuild_reason: 'model_changed' });
    s.db.prepare("update courses set archived_at='now' where id=?").run(c.id);
    expect(listCourses(s)).toEqual([]); expect(listMaterials(s, c.id)).toEqual([]);
    expect(() => storeOriginal(s, c.id, 'rejected.txt', Buffer.from('x'))).toThrow('course_unavailable');
    expect(fs.readdirSync(s.originalsDir)).toHaveLength(1);
  });
});
function setupConnection(s: Store, method: 'apiKey' | 'oauth' = 'apiKey') {
  const provider = { ...PROVIDERS[0]!, implementation: 'installed' as const, models: [{ id: 'synthetic-model', capabilities: ['tutor' as const] }] };
  saveProviderDefinition(s, provider);
  setProviderEnabled(s, provider.id, true);
  const c = newConnection('synthetic-connection', provider, 'Synthetic', method);
  c.enabled = true; c.health = 'ready'; c.billing = 'free_allowance'; c.credential = { store: 'macos-keychain', id: 'synthetic-reference' };
  c.capabilities.tutor = { enabled: true, modelId: 'synthetic-model' }; saveConnection(s, c);
  assignCapability(s, 'tutor', c.id, 'synthetic-model'); return { c, provider };
}
describe('removable provider registry foundation', () => {
  it('removes connection credentials/defaults without changing local courses or research provenance', async () => {
    const s = open(); const course = createCourse(s, 'Keep course'); const src = storeOriginal(s, course.id, 'keep.txt', Buffer.from('keep'));
    setDraft(s, { key: 'keep', courseId: course.id, body: 'Keep writing' });
    const { c } = setupConnection(s);
    s.db.prepare('insert into research_sessions values (?,?,?,?,?,?,?,?,?,?)').run('research', course.id, 'openai', c.id, 'Synthetic query', 'today', 'user', '[]', 'complete', null);
    const remove = vi.fn(async () => undefined);
    const credentials: CredentialStore = { put: vi.fn(), read: vi.fn(), remove };
    expect(JSON.stringify(exportConnectionSettings(s))).not.toMatch(/credential|synthetic-reference/);
    expect(() => deleteProviderDefinition(s, 'openai')).toThrow();
    expect(await removeConnection(s, c.id, credentials)).toBe('removed');
    expect(remove).toHaveBeenCalledWith(c.credential); expect(getConnection(s, c.id)).toBeNull();
    expect(exportConnectionSettings(s).assignments).toEqual([]);
    deleteProviderDefinition(s, 'openai');
    expect(listResearchSessions(s, course.id)[0]).toMatchObject({ providerId: 'openai', connectionId: c.id });
    expect(listCourses(s)).toHaveLength(1); expect(readOriginal(s, src).toString()).toBe('keep');
    expect(s.db.prepare('select body from drafts').get()).toEqual({ body: 'Keep writing' });
  });
  it('persists disabled cleanup state on credential failure and retries after restart', async () => {
    const dir = tmp(); const s = open(dir); const { c } = setupConnection(s);
    const credentials: CredentialStore = { put: vi.fn(), read: vi.fn(), remove: vi.fn(async () => { throw new Error('synthetic-sensitive-value'); }) };
    expect(await removeConnection(s, c.id, credentials)).toBe('cleanup_pending');
    expect(getConnection(s, c.id)).toMatchObject({ enabled: false, health: 'cleanup_pending', credential: c.credential });
    expect(JSON.stringify(exportConnectionSettings(s))).not.toContain('synthetic-sensitive-value');
    s.db.close(); const reopened = open(dir);
    expect(getConnection(reopened, c.id)?.enabled).toBe(false);
    credentials.remove = vi.fn(async () => undefined);
    expect(await removeConnection(reopened, c.id, credentials)).toBe('removed');
  });
  it('retains explicit remote-revocation pending state while removing local OAuth credentials', async () => {
    const s = open(); const { c, provider } = setupConnection(s, 'oauth');
    const credentials: CredentialStore = { put: vi.fn(), read: vi.fn(), remove: vi.fn(async () => undefined) };
    const adapter: ProviderAdapter = { definition: provider, test: vi.fn(), revoke: vi.fn(async () => { throw new Error('offline'); }) };
    expect(await removeConnection(s, c.id, credentials, adapter)).toBe('cleanup_pending');
    expect(getConnection(s, c.id)).toMatchObject({ enabled: false, credential: null, revocation: 'pending', health: 'cleanup_pending' });
    expect(exportConnectionSettings(s).assignments).toEqual([]);
  });
  it('clears only affected defaults when toggled and never selects another provider', () => {
    const s = open(); const { c } = setupConnection(s); c.capabilities.tutor!.enabled = false; saveConnection(s, c);
    expect(exportConnectionSettings(s).assignments).toEqual([]);
    expect(() => assignCapability(s, 'tutor', c.id, 'synthetic-model')).toThrow('capability_unavailable');
    expect(listConnections(s)).toHaveLength(1);
  });
});
describe('local service foundation boundaries', () => {
  it('accepts exact local preflights, rejects hostname spoofing and unmarked browser writes', async () => {
    const app = createService(open()); const origin = 'http://127.0.0.1:5173';
    const preflight = await app.inject({ method: 'OPTIONS', url: '/courses', headers: { origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type,x-cn-client' } });
    expect(preflight.statusCode).toBe(204); expect(preflight.headers['access-control-allow-origin']).toBe(origin);
    for (const host of ['localhost.evil.example', '127.0.0.1.evil.example']) expect((await app.inject({ url: '/health', headers: { host } })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/courses', headers: { origin }, payload: { name: 'Blocked' } })).statusCode).toBe(403);
    const created = await app.inject({ method: 'POST', url: '/courses', headers: { origin, 'x-cn-client': 'collegenotes-web' }, payload: { name: 'Synthetic' } });
    expect(created.statusCode).toBe(200); expect(created.headers['access-control-allow-origin']).toBe(origin); await app.close();
  });
  it('returns nonsecret connection summaries and recovers corrupt or unknown saved routes', async () => {
    const s = open(); setupConnection(s); const app = createService(s);
    const response = await app.inject({ url: '/connections' });
    expect(response.json()).toMatchObject({ liveAuthenticationAvailable: false }); expect(response.body).not.toMatch(/credential|synthetic-reference/);
    s.db.prepare('insert into sessions values (1,?)').run('{corrupt'); expect(getSession(s)).toMatchObject({ routeHash: '#/home', courseId: null });
    s.db.prepare('update sessions set payload=?').run(JSON.stringify({ routeHash: '#/courses/nonexistent/study' }));
    expect(getSession(s).notice).toContain('preserved');
    expect((await app.inject({ method: 'PUT', url: '/session', payload: {} })).statusCode).toBe(400); await app.close();
  });
});

describe('file and writing boundary repairs', () => {
  it('rejects symlink file traversal without reading an outside source', async () => {
    const s = open(); const outside = tmp(); fs.writeFileSync(path.join(outside, 'private.txt'), 'synthetic-private');
    fs.symlinkSync(outside, path.join(s.dataDir, 'escape'));
    const app = createService(s);
    expect((await app.inject({ method: 'POST', url: '/files/probe-path', payload: { path: 'escape/private.txt' } })).statusCode).toBe(400);
    await app.close();
  });
  it('rejects reassignment of an existing draft to another course', async () => {
    const s = open(); const a = createCourse(s, 'A'); const b = createCourse(s, 'B');
    setDraft(s, { key: 'note:shared', courseId: a.id, body: 'A writing' });
    const app = createService(s);
    expect((await app.inject({ method: 'PUT', url: '/drafts', payload: { key: 'note:shared', courseId: b.id, body: 'B overwrite' } })).statusCode).toBe(409);
    expect(s.db.prepare('select course_id,body from drafts').get()).toEqual({ course_id: a.id, body: 'A writing' }); await app.close();
  });
});

describe('provider-level control foundation', () => {
  it('disables every connection for the provider and requires explicit re-enable without defaults', () => {
    const s = open(); const { c } = setupConnection(s);
    const second = { ...c, id: 'second', credential: { store: 'macos-keychain' as const, id: 'second-ref' } }; saveConnection(s, second);
    setProviderEnabled(s, c.providerId, false);
    expect(listConnections(s).every((item) => !item.enabled)).toBe(true);
    expect(exportConnectionSettings(s).providers).toEqual([{ id: c.providerId, label: 'OpenAI / ChatGPT', enabled: false }]);
    expect(exportConnectionSettings(s).assignments).toEqual([]);
    expect(() => saveConnection(s, { ...c, enabled: true })).toThrow('provider_disabled');
    setProviderEnabled(s, c.providerId, true);
    expect(listConnections(s).every((item) => !item.enabled)).toBe(true);
  });
});
