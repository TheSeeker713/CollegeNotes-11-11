import {getConnection,listProviderDefinitions,saveConnection} from './foundation.js';
import {selectedCapabilities} from './connection-settings.js';
import {requestEligibility,PROVIDERS,type Capability} from '@collegenotes/providers';
import type {Store} from './database.js';
import type {TutorContext} from './hybrid-retrieval.js';
import {CourseError,requireCourse,moduleEnabled} from './courses.js';
import {createId} from '@collegenotes/domain';

export type ResearchClaim = { id: string; statement: string; supported: boolean; sourceIds: string[] };
export type ResearchSourceRow = {
  id: string; sessionId: string; courseId: string; url: string; title: string;
  publisher: string | null; author: string | null; retrievedAt: string; excerpt: string;
  claimIds: string[]; conflicts: string[]; uncertainty: string | null; access: 'available' | 'inaccessible';
};
export type ResearchSessionRow = {
  id: string; courseId: string; providerId: string; connectionId: string | null; query: string;
  createdAt: string; status: string; sharedContext: Array<{ sourceId: string; revision: number; category: 'extracted_text' | 'user_note' }>;
  claims: ResearchClaim[]; sources: ResearchSourceRow[];
};

export type ResearchPage = { url: string; title: string; publisher?: string | null; author?: string | null; text: string; access?: 'available' | 'inaccessible' };

const BLOCKED = /<(script|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi;
const TAGS = /<[^>]+>/g;
const INJECTION = /ignore (all |previous )?instructions|grant (admin|root)|system prompt|exfiltrate|override (safety|permissions)/i;

export function sanitizeResearchText(raw: string): string {
  return raw.replace(BLOCKED, ' ').replace(TAGS, ' ').replace(/\s+/g, ' ').trim().slice(0, 8000);
}

export function researchPageIsUntrusted(text: string): boolean {
  return INJECTION.test(text);
}

export function resolveCapabilityConnection(store: Store, capability: Capability) {
  const assignment = selectedCapabilities(store).find((a) => a.capability === capability);
  if (!assignment) throw new CourseError('capability_not_assigned', 409);
  const connection = getConnection(store, assignment.connectionId);
  const def = listProviderDefinitions(store).find((p) => p.id === connection?.providerId);
  const catalog = PROVIDERS.find((p) => p.id === connection?.providerId);
  if (!connection || !def || !catalog) throw new CourseError('connection_unavailable', 409);
  const provider = { ...catalog, enabled: def.enabled, implementation: 'installed' as const };
  const modelId = connection.modelId ?? assignment.modelId;
  const gated = {
    ...connection,
    capabilities: {
      ...connection.capabilities,
      [capability]: { enabled: true, modelId }
    }
  };
  const eligibility = requestEligibility(provider, gated, capability, connection.billing === 'metered_api' ? 0.01 : null);
  if (!eligibility.allowed) throw new CourseError(eligibility.reason, 409);
  return { connection: gated, provider, modelId };
}

export function startResearchSession(
  store: Store,
  courseId: string,
  input: { query: unknown; sharedContext?: unknown; acknowledgeTransmission: unknown }
) {
  requireCourse(store, courseId, true);
  if (!moduleEnabled(store, courseId, 'research')) throw new CourseError('module_disabled', 409);
  if (typeof input.query !== 'string' || !input.query.trim() || input.query.length > 500) throw new CourseError('invalid_research_query');
  if (input.acknowledgeTransmission !== true) throw new CourseError('research_consent_required');
  const shared = Array.isArray(input.sharedContext) ? input.sharedContext : [];
  for (const item of shared) {
    if (!item || typeof item !== 'object') throw new CourseError('invalid_shared_context');
    const row = item as Record<string, unknown>;
    if (typeof row.sourceId !== 'string' || typeof row.revision !== 'number' || !['extracted_text', 'user_note'].includes(row.category as string)) {
      throw new CourseError('invalid_shared_context');
    }
    const owned = store.db.prepare('select 1 as ok from source_documents where id=? and course_id=? and revision=? and trashed_at is null and deleted_at is null').get(row.sourceId, courseId, row.revision);
    if (!owned) throw new CourseError('shared_source_unavailable', 409);
  }
  const { connection, provider } = resolveCapabilityConnection(store, 'research');
  const id = createId('research');
  const createdAt = new Date().toISOString();
  store.db.prepare(`insert into research_sessions(id,course_id,provider_id,connection_id,query,created_at,initiated_by,shared_context,status,deleted_at)
    values (?,?,?,?,?,?,'user',?,'running',null)`).run(id, courseId, provider.id, connection.id, input.query.trim(), createdAt, JSON.stringify(shared));
  return { id, courseId, status: 'running' as const, connectionId: connection.id, providerId: provider.id, query: input.query.trim(), createdAt, sharedContext: shared };
}

export function cancelResearchSession(store: Store, courseId: string, sessionId: string) {
  requireCourse(store, courseId, true);
  const row = store.db.prepare("select status from research_sessions where id=? and course_id=? and deleted_at is null").get(sessionId, courseId) as { status: string } | undefined;
  if (!row) throw new CourseError('research_not_found', 404);
  if (row.status !== 'running' && row.status !== 'draft') throw new CourseError('research_not_cancellable', 409);
  store.db.prepare("update research_sessions set status='cancelled' where id=? and course_id=?").run(sessionId, courseId);
  return getResearchSession(store, courseId, sessionId);
}

export function completeResearchSession(store: Store, courseId: string, sessionId: string, pages: ResearchPage[], claims: Array<{ statement: string; sourceUrls: string[]; supported: boolean }>) {
  requireCourse(store, courseId, true);
  const session = store.db.prepare("select id,status from research_sessions where id=? and course_id=? and deleted_at is null").get(sessionId, courseId) as { id: string; status: string } | undefined;
  if (!session) throw new CourseError('research_not_found', 404);
  if (session.status !== 'running') throw new CourseError('research_not_running', 409);
  const retrievedAt = new Date().toISOString();
  const sourceIds: string[] = [];
  const claimRecords: ResearchClaim[] = [];
  store.db.transaction(() => {
    for (const page of pages) {
      let url: URL;
      try { url = new URL(page.url); } catch { throw new CourseError('invalid_research_url'); }
      if (!['http:', 'https:'].includes(url.protocol)) throw new CourseError('invalid_research_url');
      const excerpt = sanitizeResearchText(page.text);
      const id = createId('rsrc');
      sourceIds.push(id);
      const uncertainty = researchPageIsUntrusted(page.text) || researchPageIsUntrusted(excerpt)
        ? 'Page contained instruction-like wording; treated as untrusted data only.'
        : null;
      store.db.prepare(`insert into research_sources(id,session_id,course_id,url,title,publisher,author,retrieved_at,excerpt,claim_ids,conflicts,uncertainty,access)
        values (?,?,?,?,?,?,?,?,?,'[]','[]',?,?)`).run(
        id, sessionId, courseId, url.toString(), sanitizeResearchText(page.title || url.hostname).slice(0, 300) || url.hostname,
        page.publisher ?? null, page.author ?? null, retrievedAt, excerpt, uncertainty, page.access ?? 'available'
      );
      if (uncertainty) store.db.prepare('update research_sources set conflicts=? where id=?').run(JSON.stringify(['untrusted_instruction_language']), id);
    }
    for (const claim of claims) {
      const id = createId('claim');
      const linked = pages.flatMap((page, index) => claim.sourceUrls.includes(page.url) ? [sourceIds[index]!] : []);
      claimRecords.push({ id, statement: sanitizeResearchText(claim.statement).slice(0, 500), supported: claim.supported, sourceIds: linked });
      for (const sourceId of linked) {
        const row = store.db.prepare('select claim_ids from research_sources where id=?').get(sourceId) as { claim_ids: string };
        const ids = JSON.parse(row.claim_ids) as string[];
        ids.push(id);
        store.db.prepare('update research_sources set claim_ids=? where id=?').run(JSON.stringify(ids), sourceId);
      }
    }
    store.db.prepare("update research_sessions set status='complete' where id=? and course_id=?").run(sessionId, courseId);
    for (const claim of claimRecords) {
      store.db.prepare('insert into research_claims(id,session_id,course_id,statement,supported,source_ids) values (?,?,?,?,?,?)')
        .run(claim.id, sessionId, courseId, claim.statement, claim.supported ? 1 : 0, JSON.stringify(claim.sourceIds));
    }
  })();
  return getResearchSession(store, courseId, sessionId);
}

export function failResearchSession(store: Store, courseId: string, sessionId: string) {
  store.db.prepare("update research_sessions set status='failed' where id=? and course_id=? and status='running'").run(sessionId, courseId);
  return getResearchSession(store, courseId, sessionId);
}

export function getResearchSession(store: Store, courseId: string, sessionId: string): ResearchSessionRow {
  requireCourse(store, courseId, true);
  const row = store.db.prepare(`select id,course_id as courseId,provider_id as providerId,connection_id as connectionId,query,created_at as createdAt,status,shared_context as sharedContext
    from research_sessions where id=? and course_id=? and deleted_at is null`).get(sessionId, courseId) as Omit<ResearchSessionRow, 'claims' | 'sources' | 'sharedContext'> & { sharedContext: string } | undefined;
  if (!row) throw new CourseError('research_not_found', 404);
  const sources = store.db.prepare(`select id,session_id as sessionId,course_id as courseId,url,title,publisher,author,retrieved_at as retrievedAt,excerpt,claim_ids as claimIds,conflicts,uncertainty,access
    from research_sources where session_id=? and course_id=?`).all(sessionId, courseId) as Array<Omit<ResearchSourceRow, 'claimIds' | 'conflicts'> & { claimIds: string; conflicts: string }>;
  const claims = store.db.prepare('select id,statement,supported,source_ids as sourceIds from research_claims where session_id=? and course_id=?').all(sessionId, courseId) as Array<{ id: string; statement: string; supported: number; sourceIds: string }>;
  return {
    ...row,
    sharedContext: JSON.parse(row.sharedContext) as ResearchSessionRow['sharedContext'],
    sources: sources.map((s) => ({ ...s, claimIds: JSON.parse(s.claimIds) as string[], conflicts: JSON.parse(s.conflicts) as string[] })),
    claims: claims.map((c) => ({ id: c.id, statement: c.statement, supported: Boolean(c.supported), sourceIds: JSON.parse(c.sourceIds) as string[] }))
  };
}

export type TutorAction = 'explain' | 'example' | 'hint' | 'check_understanding';
export type TutorTurn = {
  id: string; sessionId: string; action: TutorAction; clientRequestId: string;
  question: string; answer: string; kind: 'model'; sources: TutorContext['passages']; researchIds: string[]; createdAt: string;
};

export function openTutorSession(store: Store, courseId: string, input: { unfinishedQuestion?: string; researchSessionId?: string | null; offline?: boolean }) {
  requireCourse(store, courseId, true);
  if (!moduleEnabled(store, courseId, 'tutoring')) throw new CourseError('module_disabled', 409);
  const offline = input.offline === true;
  let connectionId: string | null = null;
  let providerId: string | null = null;
  if (!offline) {
    const resolved = resolveCapabilityConnection(store, 'tutor');
    connectionId = resolved.connection.id;
    providerId = resolved.provider.id;
  }
  if (input.researchSessionId) {
    const research = store.db.prepare("select 1 as ok from research_sessions where id=? and course_id=? and status='complete' and deleted_at is null").get(input.researchSessionId, courseId);
    if (!research) throw new CourseError('research_not_found', 404);
  }
  const id = createId('tutor');
  const now = new Date().toISOString();
  store.db.prepare(`insert into tutor_sessions(id,course_id,connection_id,provider_id,status,offline,unfinished_question,context_json,research_session_id,created_at,updated_at)
    values (?,?,?,?, 'active', ?, ?, 'null', ?, ?, ?)`).run(id, courseId, connectionId, providerId, offline ? 1 : 0, input.unfinishedQuestion ?? '', input.researchSessionId ?? null, now, now);
  return getTutorSession(store, courseId, id);
}

export function getTutorSession(store: Store, courseId: string, sessionId: string) {
  requireCourse(store, courseId, true);
  const row = store.db.prepare(`select id,course_id as courseId,connection_id as connectionId,provider_id as providerId,status,offline,unfinished_question as unfinishedQuestion,context_json as contextJson,research_session_id as researchSessionId,created_at as createdAt,updated_at as updatedAt
    from tutor_sessions where id=? and course_id=?`).get(sessionId, courseId) as Record<string, unknown> | undefined;
  if (!row) throw new CourseError('tutor_not_found', 404);
  const turns = store.db.prepare(`select id,session_id as sessionId,client_request_id as clientRequestId,action,request_json as requestJson,response_json as responseJson,created_at as createdAt
    from tutor_turns where session_id=? and course_id=? order by created_at`).all(sessionId, courseId) as Array<Record<string, string>>;
  return {
    ...row,
    offline: Boolean(row.offline),
    context: row.contextJson === 'null' ? null : JSON.parse(row.contextJson as string),
    turns: turns.map((t) => ({ ...JSON.parse(t.responseJson!), id: t.id, sessionId: t.sessionId, clientRequestId: t.clientRequestId, action: t.action, createdAt: t.createdAt }))
  };
}

export function saveTutorContext(store: Store, courseId: string, sessionId: string, context: TutorContext, unfinishedQuestion: string) {
  requireCourse(store, courseId, true);
  store.db.prepare("update tutor_sessions set context_json=?, unfinished_question=?, updated_at=? where id=? and course_id=? and status='active'")
    .run(JSON.stringify(context), unfinishedQuestion, new Date().toISOString(), sessionId, courseId);
  return getTutorSession(store, courseId, sessionId);
}

export function recordTutorTurn(
  store: Store,
  courseId: string,
  sessionId: string,
  input: { clientRequestId: unknown; action: unknown; question: unknown; context: TutorContext; answer: string }
) {
  requireCourse(store, courseId, true);
  const session = store.db.prepare("select offline,status from tutor_sessions where id=? and course_id=?").get(sessionId, courseId) as { offline: number; status: string } | undefined;
  if (!session || session.status !== 'active') throw new CourseError('tutor_not_found', 404);
  if (!['explain', 'example', 'hint', 'check_understanding'].includes(input.action as string)) throw new CourseError('invalid_tutor_action');
  if (typeof input.clientRequestId !== 'string' || !input.clientRequestId.trim() || input.clientRequestId.length > 120) throw new CourseError('invalid_request_id');
  if (typeof input.question !== 'string' || !input.question.trim() || input.question.length > 2000) throw new CourseError('invalid_tutor_question');
  const existing = store.db.prepare('select response_json as responseJson, created_at as createdAt, id from tutor_turns where session_id=? and client_request_id=?')
    .get(sessionId, input.clientRequestId) as { responseJson: string; createdAt: string; id: string } | undefined;
  if (existing) return { ...JSON.parse(existing.responseJson), id: existing.id, sessionId, clientRequestId: input.clientRequestId, action: input.action, createdAt: existing.createdAt, replayed: true };

  if (session.offline) throw new CourseError('cloud_unavailable_offline', 409);
  resolveCapabilityConnection(store, 'tutor');

  const researchIds = store.db.prepare('select research_session_id as id from tutor_sessions where id=?').get(sessionId) as { id: string | null };
  const turn: TutorTurn = {
    id: createId('turn'),
    sessionId,
    action: input.action as TutorAction,
    clientRequestId: input.clientRequestId,
    question: input.question.trim(),
    answer: input.answer,
    kind: 'model',
    sources: input.context.passages,
    researchIds: researchIds.id ? [researchIds.id] : [],
    createdAt: new Date().toISOString()
  };
  store.db.prepare(`insert into tutor_turns(id,session_id,course_id,client_request_id,action,request_json,response_json,created_at)
    values (?,?,?,?,?,?,?,?)`).run(turn.id, sessionId, courseId, turn.clientRequestId, turn.action, JSON.stringify({ question: turn.question }), JSON.stringify(turn), turn.createdAt);
  store.db.prepare('update tutor_sessions set unfinished_question=?, context_json=?, updated_at=? where id=?')
    .run('', JSON.stringify(input.context), turn.createdAt, sessionId);
  // Record metered spend reservation when a budget exists.
  const assignment = selectedCapabilities(store).find((a) => a.capability === 'tutor');
  if (assignment) {
    const connection = getConnection(store, assignment.connectionId);
    if (connection?.billing === 'metered_api' && connection.usageLimit) {
      const spent = Number((connection.usageLimit.spent + 0.01).toFixed(4));
      if (spent > connection.usageLimit.ceiling) throw new CourseError('usage_limit', 409);
      saveConnection(store, { ...connection, usageLimit: { ...connection.usageLimit, spent } });
    }
  }
  return { ...turn, replayed: false };
}
