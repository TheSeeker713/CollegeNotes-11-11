import {useEffect,useState} from 'react';
import {api,type SearchHit} from './client';

type Context = {
  query: string;
  passages: Array<SearchHit & { role: string; methods: string[] }>;
  requirements: Array<{ text: string; sourceId: string }>;
  explanations: Array<{ text: string; sourceId: string }>;
  gap: null | { message: string };
  policy: { importedTextIsData: boolean; cannotAlterPermissions: boolean };
};

export function TutorWorkspace({courseId}:{courseId:string}){
  const [sessionId,setSessionId]=useState('');
  const [question,setQuestion]=useState('');
  const [action,setAction]=useState<'explain'|'example'|'hint'|'check_understanding'>('explain');
  const [context,setContext]=useState<Context|null>(null);
  const [turns,setTurns]=useState<Array<{id:string;action:string;question:string;answer:string;kind:string;replayed?:boolean}>>([]);
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [offline,setOffline]=useState(false);

  useEffect(()=>{let active=true;void api.tutor.open(courseId,{offline:false}).then(s=>{if(active){setSessionId(s.id);setTurns(s.turns??[]);if(s.unfinishedQuestion)setQuestion(s.unfinishedQuestion);}}).catch(e=>setNotice(e instanceof Error?e.message:'Tutor unavailable. Enable the Tutoring module and assign a tutor connection.'));return()=>{active=false;};},[courseId]);

  async function ask(){
    if(!sessionId||!question.trim())return;setBusy(true);setNotice('');
    try{
      if(offline){setNotice('Cloud tutoring is unavailable offline. Local course reading and search still work.');return;}
      const ctx=await api.tutor.context(courseId,question.trim());setContext(ctx);
      const turn=await api.tutor.turn(courseId,sessionId,{clientRequestId:crypto.randomUUID(),action,question:question.trim()});
      setTurns(t=>turn.replayed?t:[...t,turn]);
      setNotice(turn.kind==='model'?'Model reply (separate from course sources and research).':'');
    }catch(e){setNotice(e instanceof Error?e.message:'Tutor request failed');}
    finally{setBusy(false);}
  }

  return <main className="glass glass-card"><h1>Tutoring</h1><p>Live model tutoring is unavailable in this build. You can still read and search your own sources. Imported material cannot change permissions.</p>
    <label><input type="checkbox" checked={offline} onChange={e=>setOffline(e.target.checked)}/>Simulate offline (blocks cloud requests)</label>
    <label>Action<select value={action} onChange={e=>setAction(e.target.value as typeof action)}><option value="explain">Explain</option><option value="example">Example</option><option value="hint">Hint</option><option value="check_understanding">Check understanding</option></select></label>
    <label>Question<textarea rows={3} maxLength={2000} value={question} onChange={e=>setQuestion(e.target.value)}/></label>
    <button disabled={busy||!sessionId} onClick={()=>void ask()}>Ask</button>
    <p role="status">{notice}</p>
    {context&&<section><h2>Grounded course context</h2>{context.gap?<p role="status">{context.gap.message}</p>:null}
      <ul>{context.passages.map(p=><li key={`${p.sourceId}-${p.start}`}><strong>{p.role}</strong> · {p.methods.join('+')} · <a href={`#/courses/${courseId}/reading`}>{p.sourceId.slice(-8)}</a><pre>{p.text}</pre></li>)}</ul>
      <p>Policy: imported text is data{context.policy.cannotAlterPermissions?'; cannot alter permissions':''}.</p></section>}
    <section><h2>Session</h2>{turns.map(t=><article key={t.id} className="glass"><p><strong>{t.action}</strong> · model</p><p>{t.question}</p><pre>{t.answer}</pre></article>)}</section>
  </main>;
}
