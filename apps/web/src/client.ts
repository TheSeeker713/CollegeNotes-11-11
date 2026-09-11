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
  return res.json() as Promise<T>;
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
  materials: {
    list: (courseId:string)=>req<Array<{id:string;filename:string;revision:number}>>(`/courses/${courseId}/materials`),
    detail: (courseId:string,id:string)=>req<{material:{id:string;filename:string;revision:number};revisions:Array<{revision:number;text:string;anchors:string;author:string;createdAt:string}>}>(`/courses/${courseId}/materials/${id}`),
    original: (courseId:string,id:string)=>`${BASE}/courses/${courseId}/materials/${id}/original`,
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
