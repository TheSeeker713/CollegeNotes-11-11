import type { Connection, ProviderDefinition } from '@collegenotes/providers/contracts';
import type { Appearance, CardLayout, Course, ModuleSelection, CourseModuleId, Draft, Job, SessionState } from '@collegenotes/domain';

const BASE = 'http://127.0.0.1:4781';
const headers = { 'content-type': 'application/json', 'x-cn-client': 'collegenotes-web' };

async function send<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...(init?.headers ?? {}) } });
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(error?.error ?? `http_${res.status}`);
  }
  const result=await res.json() as T;
  if(init?.method&&init.method!=='GET'&&/^\/courses\/[^/]+(?:\/materials\/|\/(?:archive|restore)$|$|\/reading\/[^/]+\/annotations)/.test(path)){
    const id=path.split('/')[2]!;
    try{await (await import('./offline-cache')).removePack(id);}catch{window.dispatchEvent(new Event('cn-offline-cleanup-failed'));}
  }
  return result;
}

// Serialize writes so an earlier slow draft/settings request cannot overwrite a newer one.
let writes: Promise<unknown> = Promise.resolve();
function req<T>(path: string, init?: RequestInit): Promise<T> {
  if (!init?.method || init.method === 'GET') return send<T>(path, init);
  const next = writes.catch(() => undefined).then(() => send<T>(path, init));
  writes = next.catch(() => undefined);
  return next;
}

export const api = {
 audio: {
  voices: () => req<import('@collegenotes/domain').VoiceProfile[]>('/audio/voices'),
  list: (c: string, sourceId?: string) => req<import('@collegenotes/domain').NarrationAsset[]>(`/courses/${c}/audio/narrations${sourceId ? `?sourceId=${encodeURIComponent(sourceId)}` : ''}`),
  generate: (c: string, body: { sourceId: string; voiceId: string; rate?: number }) => req<import('@collegenotes/domain').NarrationAsset & { timing: { startupMs: number; throughputCharsPerSec: number; costUsd: 0; downloadedBytes: 0 }; reused: boolean }>(`/courses/${c}/audio/narrations`, { method: 'POST', body: JSON.stringify(body) }),
  get: (c: string, id: string) => req<import('@collegenotes/domain').NarrationAsset>(`/courses/${c}/audio/narrations/${id}`),
  fileUrl: (c: string, id: string) => `${BASE}/courses/${c}/audio/narrations/${id}/file`,
  playback: (c: string, id: string) => req<import('@collegenotes/domain').NarrationPlaybackState>(`/courses/${c}/audio/narrations/${id}/playback`),
  savePlayback: (c: string, id: string, body: unknown) => req<import('@collegenotes/domain').NarrationPlaybackState>(`/courses/${c}/audio/narrations/${id}/playback`, { method: 'PUT', body: JSON.stringify(body) }),
  recognize: (c: string, body: unknown) => req<import('@collegenotes/domain').RecognitionTranscript>(`/courses/${c}/audio/recognition`, { method: 'POST', body: JSON.stringify(body) }),
  updateRecognition: (c: string, id: string, body: unknown) => req<import('@collegenotes/domain').RecognitionTranscript>(`/courses/${c}/audio/recognition/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  interrupt: (c: string, body: unknown) => req<import('@collegenotes/domain').VoiceInterruptSession>(`/courses/${c}/audio/interrupt`, { method: 'POST', body: JSON.stringify(body) }),
  advanceInterrupt: (c: string, id: string, body: unknown) => req<import('@collegenotes/domain').VoiceInterruptSession>(`/courses/${c}/audio/interrupt/${id}`, { method: 'POST', body: JSON.stringify(body) }),
  echo: (c: string, id: string) => req<{ suppressed: boolean }>(`/courses/${c}/audio/interrupt/${id}/echo`)
 },
 study: {
  session:(c:string)=>req<import('@collegenotes/domain').StudySession|null>(`/courses/${c}/study/session`),
  openSession:(c:string,limit:number)=>req<import('@collegenotes/domain').StudySession>(`/courses/${c}/study/sessions`,{method:'POST',body:JSON.stringify({limit})}),
  changeSession:(c:string,id:string,version:number,action:string)=>req<import('@collegenotes/domain').StudySession>(`/courses/${c}/study/sessions/${id}`,{method:'PUT',body:JSON.stringify({version,action})}),
  progress:(c:string)=>req<import('@collegenotes/domain').StudyProgress>(`/courses/${c}/study/progress`),
  workload:(c:string,dailyLimit:number)=>req<import('@collegenotes/domain').StudyProgress>(`/courses/${c}/study/workload`,{method:'PUT',body:JSON.stringify({dailyLimit})}),
  review:(c:string,id:string,action:'reset'|'undo')=>req<import('@collegenotes/domain').StudyProgress>(`/courses/${c}/study/activities/${id}/review/${action}`,{method:'POST'}),
  attempts:(c:string)=>req<import('@collegenotes/domain').StudyAttempt[]>(`/courses/${c}/study/attempts`),
  start:(c:string,a:string)=>req<import('@collegenotes/domain').AttemptView>(`/courses/${c}/study/activities/${a}/attempts`,{method:'POST'}),
  attempt:(c:string,id:string)=>req<import('@collegenotes/domain').AttemptView>(`/courses/${c}/study/attempts/${id}`),
  update:(c:string,id:string,action:string,body:unknown)=>req<import('@collegenotes/domain').AttemptView>(`/courses/${c}/study/attempts/${id}/${action}`,{method:'POST',body:JSON.stringify(body)}),
  activities:(c:string)=>req<import('@collegenotes/domain').StudyActivitySummary[]>(`/courses/${c}/study/activities`),
  create:(c:string,body:import('@collegenotes/domain').ActivityTemplate)=>req<import('@collegenotes/domain').StudyActivity>(`/courses/${c}/study/activities`,{method:'POST',body:JSON.stringify(body)}),
  remove:(c:string,id:string)=>req(`/courses/${c}/study/activities/${id}`,{method:'DELETE'})
 },
 aiConnections:{
 endpoint:(id:string,endpoint:string)=>req(`/ai-connections/${id}/endpoint`,{method:'PUT',body:JSON.stringify({endpoint})}),
  settings:(id:string,body:{modelId:string;billing:string;ceiling:number|null;capabilities:string[]})=>req(`/ai-connections/${id}/settings`,{method:'PUT',body:JSON.stringify(body)}),
 provider:(id:string,enabled:boolean)=>req(`/ai-providers/${id}`,{method:'PUT',body:JSON.stringify({enabled})}),
 assign:(capability:string,connectionId:string|null)=>req(`/ai-defaults/${capability}`,{method:'PUT',body:JSON.stringify({connectionId})}),
 export:()=>req('/ai-connections/export'),
 list:()=>req<{connections:Array<Omit<Connection,'credential'>&{configured:boolean}>;providers:Array<ProviderDefinition&{enabled:boolean}>;assignments:Array<{capability:string;connectionId:string;modelId:string}>;preferences:{onboardingDismissed:number;selectedConnectionId:string|null}}>('/ai-connections'),
 add:(body:{providerId:string;label:string;authMethod:string;endpoint?:string;modelId?:string})=>req<Connection>('/ai-connections',{method:'POST',body:JSON.stringify(body)}),
 preferences:(body:{onboardingDismissed?:boolean;selectedConnectionId?:string|null})=>req('/ai-connections/preferences',{method:'PUT',body:JSON.stringify(body)}),
 update:(id:string,body:{label?:string;enabled?:boolean})=>req(`/ai-connections/${id}`,{method:'PUT',body:JSON.stringify(body)}),
 remove:(id:string)=>req(`/ai-connections/${id}`,{method:'DELETE'}),
 status:(id:string)=>req<{connected:boolean;plan:string|null;loginPending:boolean;error?:string|null;needsRefresh?:boolean;cleanupPending?:boolean;loginDetails?:{authUrl:string;userCode:string}|null}>(`/ai-connections/${id}/account`),
 saveCredential:(id:string,secret:string)=>req(`/ai-connections/${id}/credential`,{method:'POST',body:JSON.stringify({secret})}),
 login:(id:string)=>req<{authUrl:string;userCode?:string}>(`/ai-connections/${id}/login`,{method:'POST'}),
 cancel:(id:string)=>req(`/ai-connections/${id}/cancel`,{method:'POST'}),
 revoke:(id:string)=>req<{revoked:boolean;localAccessRemoved:boolean}>(`/ai-connections/${id}/revoke`,{method:'POST'}),
 disconnect:(id:string)=>req(`/ai-connections/${id}/disconnect`,{method:'POST'})
 },
 offlinePack:(c:string,sourceIds:string[])=>req<import('./offline-cache').OfflinePack>(`/courses/${c}/offline-pack`,{method:'POST',body:JSON.stringify({sourceIds})}),
 lexical:(c:string,query:string)=>req<SearchHit[]>(`/courses/${c}/lexical-search`,{method:'POST',body:JSON.stringify({query})}),
 semantic:(c:string,query:string)=>req<SearchHit[]>(`/courses/${c}/local-index/query`,{method:'POST',body:JSON.stringify({query})}),
 reading:{
 lastSource:(c:string)=>req<{sourceId:string;revision:number}|null>(`/courses/${c}/reading-session`),
 annotations:(c:string,s:string)=>req<import('@collegenotes/domain').Annotation[]>(`/courses/${c}/reading/${s}/annotations`),
 addAnnotation:(c:string,s:string,body:unknown)=>req<import('@collegenotes/domain').Annotation>(`/courses/${c}/reading/${s}/annotations`,{method:'POST',body:JSON.stringify(body)}),
 editAnnotation:(c:string,s:string,id:string,note:string,version:number)=>req(`/courses/${c}/reading/${s}/annotations/${id}`,{method:'PUT',body:JSON.stringify({note,version})}),
 deleteAnnotation:(c:string,s:string,id:string,version:number)=>req(`/courses/${c}/reading/${s}/annotations/${id}`,{method:'DELETE',body:JSON.stringify({version})}),
 position:(c:string,s:string,revision?:number)=>req<import('@collegenotes/domain').ReadingPosition|null>(`/courses/${c}/reading/${s}/position${revision?`?revision=${revision}`:''}`),
 savePosition:(c:string,s:string,body:import('@collegenotes/domain').ReadingPosition)=>req<import('@collegenotes/domain').ReadingPosition>(`/courses/${c}/reading/${s}/position`,{method:'PUT',body:JSON.stringify(body)}),
 document:(c:string,s:string,revision?:number)=>req<import('@collegenotes/domain').ReadingDocument>(`/courses/${c}/reading/${s}${revision?`?revision=${revision}`:''}`),
 epub:(c:string,s:string)=>req<{chapters:Array<{location:string;title:string;html:string}>;warnings:string[]}>(`/courses/${c}/reading/${s}/epub`)
 },
  materials: {
    list: (courseId:string)=>req<MaterialSummary[]>(`/courses/${courseId}/materials`),
    detail: (courseId:string,id:string)=>req<MaterialDetail>(`/courses/${courseId}/materials/${id}`),
    original: (courseId:string,id:string)=>`${BASE}/courses/${courseId}/materials/${id}/original`,
    preview: (courseId:string,id:string,page:number)=>`${BASE}/courses/${courseId}/materials/${id}/preview/${page}`,
    correct: (courseId:string,id:string,text:string,expectedRevision:number)=>req<MaterialDetail>(`/courses/${courseId}/materials/${id}`,{method:'PUT',body:JSON.stringify({text,expectedRevision})}),
    approve: (courseId:string,id:string,expectedRevision:number)=>req<MaterialDetail>(`/courses/${courseId}/materials/${id}/approve`,{method:'POST',body:JSON.stringify({expectedRevision,reviewed:true})}),
    trash: (courseId:string,id:string)=>req(`/courses/${courseId}/materials/${id}/trash`,{method:'POST'}),
    restore: (courseId:string,id:string)=>req(`/courses/${courseId}/materials/${id}/restore`,{method:'POST'}),
    delete: (courseId:string,id:string,confirmation:string,backupsAcknowledged:boolean)=>req(`/courses/${courseId}/materials/${id}`,{method:'DELETE',body:JSON.stringify({confirmation,backupsAcknowledged})}),
    export: (courseId:string,sourceIds:string[])=>req(`/courses/${courseId}/material-export`,{method:'POST',body:JSON.stringify({sourceIds})}),
    index: (courseId:string)=>req<LocalIndex>(`/courses/${courseId}/local-index`),
    rebuild: (courseId:string)=>req(`/courses/${courseId}/local-index`,{method:'POST'}),
    cancelIndex: (courseId:string)=>req(`/courses/${courseId}/local-index/cancel`,{method:'POST'}),
    tasks: (courseId:string) => req<Array<{id:string;sourceId:string;status:string;error:string|null;progress:number}>>(`/courses/${courseId}/imports`),
    import: (courseId:string,filename:string,contentBase64:string,kind:'note'|'imported'='imported') => req(`/courses/${courseId}/imports`,{method:'POST',body:JSON.stringify({filename,contentBase64,kind})}),
    action: (courseId:string,id:string,action:'cancel'|'retry'|'process')=>req(`/courses/${courseId}/imports/${id}/${action}`,{method:'POST'})
  },
  connections: () => req<{ availableProviders: ProviderDefinition[]; connections: Array<Omit<Connection, 'credential'>>; liveAuthenticationAvailable: false }>('/connections'),
  async health() {
    return req<{ ok: boolean }>(`/health`);
  },
  courses: {
    list: () => req<Course[]>('/courses'),
    collection: () => req<Course[]>('/course-collection'),
    create: (name: string, description = '') => req<Course>('/courses', { method: 'POST', body: JSON.stringify({ name, description }) }),
    edit: (id: string, name: string, description: string) => req<Course>(`/courses/${id}`, { method: 'PUT', body: JSON.stringify({ name, description }) }),
    archive: (id: string) => req<Course>(`/courses/${id}/archive`, { method: 'POST' }),
    restore: (id: string) => req<Course>(`/courses/${id}/restore`, { method: 'POST' }),
    export: async (id: string) => { await writes; return req<unknown>(`/courses/${id}/export`); },
    delete: (id: string, confirmation: string, backupsAcknowledged: boolean) => req<{ deleted: true }>(`/courses/${id}`, { method: 'DELETE', body: JSON.stringify({ confirmation, backupsAcknowledged }) }),
    modules: (id: string) => req<ModuleSelection[]>(`/courses/${id}/modules`),
    setModule: (id: string, moduleId: CourseModuleId, enabled: boolean) => req<ModuleSelection[]>(`/courses/${id}/modules/${moduleId}`, { method: 'PUT', body: JSON.stringify({ enabled }) })
  },
  appearance: {
    get: () => req<Appearance>('/appearance'),
    put: (appearance: Appearance) => req<Appearance>('/appearance', { method: 'PUT', body: JSON.stringify(appearance) })
  },
  layouts: {
    get: (courseId: string) => req<CardLayout>(`/courses/${courseId}/layout`),
    put: (courseId: string, layout: CardLayout) => req<CardLayout>(`/courses/${courseId}/layout`, { method: 'PUT', body: JSON.stringify(layout) })
  },
  session: {
    get: () => req<SessionState>('/session'),
    put: (session: SessionState) => req<SessionState>('/session', { method: 'PUT', body: JSON.stringify(session) })
  },
  drafts: {
    get: (key: string) => req<Draft | null>(`/drafts/${encodeURIComponent(key)}`),
    put: (draft: Omit<Draft, 'updatedAt'>) => req<Draft>('/drafts', { method: 'PUT', body: JSON.stringify(draft) })
  },
  jobs: {
    create: (body: { courseId: string; filename: string; contentBase64: string }) => req<Job>('/jobs', { method: 'POST', body: JSON.stringify(body) }),
    get: (id: string) => req<Job>(`/jobs/${id}`),
    cancel: (id: string) => req<Job>(`/jobs/${id}/cancel`, { method: 'POST' }),
    retry: (id: string) => req<Job>(`/jobs/${id}/retry`, { method: 'POST' })
  },
  research: {
    list: (courseId: string) => req<Array<{ id: string; query: string; status: string; createdAt: string }>>(`/courses/${courseId}/research`),
    start: (courseId: string, body: { query: string; acknowledgeTransmission: boolean; sharedContext: unknown[] }) =>
      req<{ id: string; status: string }>(`/courses/${courseId}/research/sessions`, { method: 'POST', body: JSON.stringify(body) }),
    get: (courseId: string, sessionId: string) => req<{
      id: string; query: string; status: string; createdAt: string;
      claims: Array<{ statement: string; supported: boolean }>;
      sources: Array<{ url: string; title: string; retrievedAt: string; excerpt: string; uncertainty: string | null; conflicts: string[] }>;
    }>(`/courses/${courseId}/research/sessions/${sessionId}`),
    cancel: (courseId: string, sessionId: string) => req<{
      id: string; query: string; status: string; createdAt: string;
      claims: Array<{ statement: string; supported: boolean }>;
      sources: Array<{ url: string; title: string; retrievedAt: string; excerpt: string; uncertainty: string | null; conflicts: string[] }>;
    }>(`/courses/${courseId}/research/sessions/${sessionId}/cancel`, { method: 'POST' })
  },
  tutor: {
    context: (courseId: string, query: string) => req<{
      query: string; passages: Array<SearchHit & { role: string; methods: string[] }>;
      requirements: Array<{ text: string; sourceId: string }>; explanations: Array<{ text: string; sourceId: string }>;
      gap: null | { message: string }; policy: { importedTextIsData: boolean; cannotAlterPermissions: boolean };
    }>(`/courses/${courseId}/tutor-context`, { method: 'POST', body: JSON.stringify({ query }) }),
    open: (courseId: string, body: { unfinishedQuestion?: string; researchSessionId?: string | null; offline?: boolean }) =>
      req<{ id: string; unfinishedQuestion: string; turns: Array<{ id: string; action: string; question: string; answer: string; kind: string }> }>(`/courses/${courseId}/tutor/sessions`, { method: 'POST', body: JSON.stringify(body) }),
    get: (courseId: string, sessionId: string) => req<Record<string, unknown>>(`/courses/${courseId}/tutor/sessions/${sessionId}`),
    turn: (courseId: string, sessionId: string, body: { clientRequestId: string; action: string; question: string }) =>
      req<{ id: string; action: string; question: string; answer: string; kind: string; replayed?: boolean }>(`/courses/${courseId}/tutor/sessions/${sessionId}/turns`, { method: 'POST', body: JSON.stringify(body) })
  }
};

export type MaterialSummary={id:string;filename:string;revision:number;kind:'note'|'imported';approvedRevision:number|null;trashedAt:string|null;deletedAt:string|null;cleanupState:string};
export type MaterialDetail={material:MaterialSummary;revisions:Array<{revision:number;text:string;anchors:string;author:string;createdAt:string}>};
export type LocalIndex={index:{status:string;modelVersion:string;rebuildReason:string|null}|null;modelReady:boolean;model:{id:string;version:string}};

export type SearchHit={sourceId:string;revision:number;text:string;start:number;end:number;score:number};
