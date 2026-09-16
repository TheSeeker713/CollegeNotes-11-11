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
    try{await (await import('./offline-cache')).removePack(id);}catch{throw new Error('operation_saved_but_browser_copy_cleanup_failed');}
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
 offlinePack:(c:string,sourceIds:string[])=>req<import('./offline-cache').OfflinePack>(`/courses/${c}/offline-pack`,{method:'POST',body:JSON.stringify({sourceIds})}),
 lexical:(c:string,query:string)=>req<SearchHit[]>(`/courses/${c}/lexical-search`,{method:'POST',body:JSON.stringify({query})}),
 semantic:(c:string,query:string)=>req<SearchHit[]>(`/courses/${c}/local-index/query`,{method:'POST',body:JSON.stringify({query})}),
 reading:{
 annotations:(c:string,s:string)=>req<import('@collegenotes/domain').Annotation[]>(`/courses/${c}/reading/${s}/annotations`),
 addAnnotation:(c:string,s:string,body:unknown)=>req<import('@collegenotes/domain').Annotation>(`/courses/${c}/reading/${s}/annotations`,{method:'POST',body:JSON.stringify(body)}),
 editAnnotation:(c:string,s:string,id:string,note:string,version:number)=>req(`/courses/${c}/reading/${s}/annotations/${id}`,{method:'PUT',body:JSON.stringify({note,version})}),
 deleteAnnotation:(c:string,s:string,id:string,version:number)=>req(`/courses/${c}/reading/${s}/annotations/${id}`,{method:'DELETE',body:JSON.stringify({version})}),
 position:(c:string,s:string)=>req<import('@collegenotes/domain').ReadingPosition|null>(`/courses/${c}/reading/${s}/position`),
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
  }
};

export type MaterialSummary={id:string;filename:string;revision:number;kind:'note'|'imported';approvedRevision:number|null;trashedAt:string|null;deletedAt:string|null;cleanupState:string};
export type MaterialDetail={material:MaterialSummary;revisions:Array<{revision:number;text:string;anchors:string;author:string;createdAt:string}>};
export type LocalIndex={index:{status:string;modelVersion:string;rebuildReason:string|null}|null;modelReady:boolean;model:{id:string;version:string}};

export type SearchHit={sourceId:string;revision:number;text:string;start:number;end:number;score:number};
