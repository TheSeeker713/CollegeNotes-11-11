import {useState} from 'react';
import {readingPreferences,type ReadingPreferences} from '@collegenotes/domain';
const KEY='collegenotes-reading-preferences-v1';
export function useReadingPreferences(){
 const [preferences,setPreferences]=useState(()=>{try{return readingPreferences(JSON.parse(localStorage.getItem(KEY)??'null'));}catch{return readingPreferences(null);}}),[error,setError]=useState('');
 function change(patch:Partial<ReadingPreferences>){setPreferences(p=>{const next=readingPreferences({...p,...patch});try{localStorage.setItem(KEY,JSON.stringify(next));setError('');}catch{setError('Reading preferences could not be saved in this browser.');}return next;});}
 return {preferences,change,error};
}
export function ReadingControls({preferences:p,change,error}:{preferences:ReadingPreferences;change:(patch:Partial<ReadingPreferences>)=>void;error:string}){
 return <details className="glass glass-card"><summary>Reading controls</summary><div className="reader-toolbar"><label>Text / original zoom<select value={p.zoom} onChange={e=>change({zoom:Number(e.target.value)})}>{[75,100,125,150,175,200].map(n=><option key={n} value={n}>{n}%</option>)}</select></label><label>Density<select value={p.density} onChange={e=>change({density:e.target.value as ReadingPreferences['density']})}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label><label>Line spacing<select value={p.spacing} onChange={e=>change({spacing:Number(e.target.value) as ReadingPreferences['spacing']})}><option value={1.4}>Close</option><option value={1.7}>Standard</option><option value={2}>Wide</option></select></label><label><input type="checkbox" checked={p.focus} onChange={e=>change({focus:e.target.checked})}/> Focus on reading</label><label><input type="checkbox" checked={p.context} onChange={e=>change({context:e.target.checked})}/> Show source context</label><label><input type="checkbox" checked={p.reduceMotion} onChange={e=>change({reduceMotion:e.target.checked})}/> Reduce reading motion</label></div>{error&&<p role="status">{error}</p>}</details>;
}
