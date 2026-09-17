import {useEffect,useState} from 'react';
import {api} from './client';

type Session={id:string;query:string;status:string;createdAt:string;claims?:Array<{statement:string;supported:boolean}>;sources?:Array<{url:string;title:string;retrievedAt:string;excerpt:string;uncertainty:string|null;conflicts:string[]}>};

export function ResearchWorkspace({courseId}:{courseId:string}){
  const [query,setQuery]=useState('');
  const [consent,setConsent]=useState(false);
  const [sessions,setSessions]=useState<Session[]>([]);
  const [active,setActive]=useState<Session|null>(null);
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);

  async function refresh(){setSessions(await api.research.list(courseId));}
  useEffect(()=>{let active=true;void api.research.list(courseId).then(s=>{if(active)setSessions(s);}).catch(()=>setNotice('Research list unavailable. Enable the Research module and choose a research connection.'));return()=>{active=false;};},[courseId]);

  async function run(){
    setBusy(true);setNotice('');
    try{
      const started=await api.research.start(courseId,{query,acknowledgeTransmission:consent,sharedContext:[]});
      setNotice('Research started. Private course text is sent only when you explicitly attach excerpts.');
      for(let i=0;i<40;i++){
        await new Promise(r=>setTimeout(r,200));
        const detail=await api.research.get(courseId,started.id);
        setActive(detail);if(detail.status!=='running')break;
      }
      await refresh();
    }catch(e){setNotice(e instanceof Error?e.message:'Research failed');}
    finally{setBusy(false);}
  }

  async function cancel(id:string){
    setBusy(true);try{setActive(await api.research.cancel(courseId,id));await refresh();}catch(e){setNotice(e instanceof Error?e.message:'Cancel failed');}finally{setBusy(false);}
  }

  return <main className="glass glass-card"><h1>Internet research</h1>
    <p>User-initiated only. Results keep URL, title, retrieval time, excerpts and claim links. Web pages are untrusted data.</p>
    <label>Query<input maxLength={500} value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>I understand a connected provider will receive this query (and only excerpts I attach).</label>
    <button disabled={busy||!query.trim()||!consent} onClick={()=>void run()}>Start research</button>
    <p role="status">{notice}</p>
    {active&&<section><h2>Current session · {active.status}</h2>{active.status==='running'&&<button disabled={busy} onClick={()=>void cancel(active.id)}>Cancel</button>}
      <ul>{(active.sources??[]).map(s=><li key={s.url}><a href={s.url} rel="noreferrer">{s.title}</a> · {s.retrievedAt}<pre>{s.excerpt}</pre>{s.uncertainty&&<p>{s.uncertainty}</p>}{s.conflicts?.length?<p>Conflicts: {s.conflicts.join(', ')}</p>:null}</li>)}</ul>
      <ul>{(active.claims??[]).map(c=><li key={c.statement}>{c.supported?'Supported':'Unsupported'}: {c.statement}</li>)}</ul>
    </section>}
    <section><h2>Saved sessions</h2><ul>{sessions.map(s=><li key={s.id}><button type="button" onClick={()=>void api.research.get(courseId,s.id).then(setActive)}>{s.query} · {s.status}</button></li>)}</ul></section>
  </main>;
}
