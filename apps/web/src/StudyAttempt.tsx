import {useRef,useState} from 'react';
import type {AttemptView} from '@collegenotes/domain';
import {api} from './client';
export function StudyAttemptPanel({initial,onRetry,onSubmitted}:{initial:AttemptView;onRetry:()=>void;onSubmitted?:()=>void}) {
 const [view,setView]=useState(initial),[response,setResponse]=useState(initial.attempt.response),[teachBack,setTeachBack]=useState(initial.attempt.teachBack),[notice,setNotice]=useState(''),[pending,setPending]=useState(0);
 const current=useRef(initial),queue=useRef(Promise.resolve()),failed=useRef(false);
 function enqueue(action:string,values?:{response:string[];teachBack:string}){
  setPending(n=>n+1);
  queue.current=queue.current.then(async()=>{
   if(failed.current&&action!=='save')throw Error('Save your draft successfully before continuing.');
   const next=await api.study.update(view.attempt.courseId,view.attempt.id,action,{version:current.current.attempt.version,...values});current.current=next;setView(next);failed.current=false;setNotice('Saved locally.');if(action==='submit')onSubmitted?.();
  }).catch(e=>{failed.current=true;setNotice(`${e.message}. Your text remains in this window. Copy it before reloading if the error persists.`);}).finally(()=>setPending(n=>n-1));
 }
 function edit(next:string[],explanation=teachBack){setResponse(next);setTeachBack(explanation);enqueue('save',{response:next,teachBack:explanation});}
 const a=view.activity,submitted=view.attempt.status==='submitted';
 function move(index:number,delta:number){const next=[...response];[next[index],next[index+delta]]=[next[index+delta]!,next[index]!];edit(next);}
 return <section className="glass glass-card" aria-label="Current study attempt"><h2>{a.title}</h2><p>{a.prompt}</p><p>{submitted?'Submitted attempt':'Attempt before revealing the answer'}</p>
 <fieldset disabled={submitted}><legend>Your response</legend>
 {a.kind==='multiple_choice'?a.choices.map(choice=><label key={choice}><input type="radio" name={`answer-${view.attempt.id}`} checked={response[0]===choice} onChange={()=>edit([choice])}/>{choice}</label>):a.kind==='ordering'?<ol>{response.map((item,i)=><li key={item}>{item} <button type="button" disabled={i===0} aria-label={`Move ${item} earlier`} onClick={()=>move(i,-1)}>Move earlier</button> <button type="button" disabled={i===response.length-1} aria-label={`Move ${item} later`} onClick={()=>move(i,1)}>Move later</button></li>)}</ol>:['classification','evidence_matching'].includes(a.kind)?a.items.map((item,i)=><label key={item}>{item}<select value={response[i]} onChange={e=>edit(response.map((v,j)=>j===i?e.target.value:v))}><option value="">Choose</option>{a.choices.map(c=><option key={c}>{c}</option>)}</select></label>):<label>Your answer<textarea maxLength={10000} value={response[0]} onChange={e=>edit([e.target.value])}/></label>}
 <label>Teach back: explain your reasoning {a.kind==='prediction'?'(required)':'(optional)'}<textarea maxLength={20000} value={teachBack} onChange={e=>edit(response,e.target.value)}/></label></fieldset>
 <p role="status">{pending?'Saving locally…':notice}</p>
 {!submitted&&<><button disabled={pending>0} onClick={()=>enqueue('save',{response,teachBack})}>Save draft</button><button disabled={pending>0||view.attempt.hintCount>=view.hintTotal} onClick={()=>enqueue('hint')}>Next hint ({view.attempt.hintCount}/{view.hintTotal})</button><button disabled={pending>0||response.some(r=>!r.trim())} onClick={()=>enqueue('submit')}>Submit attempt</button></>}
 {view.visibleHints.map((hint,i)=><p key={i}>Hint {i+1}: {hint}</p>)}
 {view.attempt.feedback&&<section><h3>Feedback: {view.attempt.feedback.outcome.replace('_',' ')}</h3><p>{view.attempt.feedback.message}</p><ul>{view.attempt.feedback.rubric.map((r,i)=><li key={i}>{r}</li>)}</ul><p>Practice feedback, not a course grade.</p></section>}
 {submitted&&!view.solution&&<button disabled={pending>0} onClick={()=>enqueue('reveal')}>Reveal prepared answer and rationale</button>}
 {view.solution&&<section><h3>Prepared answer</h3><ol>{view.solution.answer.map((v,i)=><li key={i}>{v}</li>)}</ol><p>{view.solution.rationale}</p></section>}
 <details><summary>Source evidence and attribution</summary><p>{a.provenance.kind==='user'?'User-authored':`Model-authored: ${a.provenance.providerId} / ${a.provenance.modelId}`}</p>{a.sources.map((s,i)=><div key={i}><p>Source {s.sourceId} · revision {s.revision} · characters {s.start}–{s.end}</p><blockquote>{s.quote}</blockquote><a href={`#/courses/${view.attempt.courseId}/reading`}>Open course reader</a></div>)}</details>
 {submitted&&<button disabled={pending>0} onClick={onRetry}>Try a fresh attempt</button>}</section>;
}
