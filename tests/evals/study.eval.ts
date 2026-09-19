import {expect,it} from 'vitest';
import {parseActivity,scoreActivity,nextReview} from '@collegenotes/learning';
import type {ActivityTemplate} from '@collegenotes/domain';
const base:ActivityTemplate={schemaVersion:1,kind:'multiple_choice',title:'Synthetic evaluation v1',prompt:'Choose the first letter',items:[],choices:['A','B'],answer:['A'],rationale:'The ordered source begins with A.',rubric:['Use the source order.'],hints:[],sources:[{sourceId:'synthetic',revision:1,start:0,end:3,quote:'A B'}],provenance:{kind:'model',providerId:'synthetic-evaluation',modelId:'fixture-v1'},needsReview:false};
it('CHK-9.4-05 synthetic study evaluation v1 covers all six formats and negative controls',()=>{
 const fixtures:Array<{template:ActivityTemplate;response:string[];expected:string}>=[
 {template:base,response:['A'],expected:'correct'}, {template:base,response:['B'],expected:'incorrect'},
 {template:{...base,kind:'ordering',items:['B','A'],choices:[],answer:['A','B']},response:['A','B'],expected:'correct'},
 {template:{...base,kind:'classification',items:['first','second'],answer:['A','B']},response:['B','A'],expected:'incorrect'},
 {template:{...base,kind:'evidence_matching',items:['first','second'],answer:['A','B']},response:['A','B'],expected:'correct'},
 {template:{...base,kind:'recall',choices:[]},response:['A'],expected:'needs_review'},
 {template:{...base,kind:'prediction',choices:[]},response:['B because…'],expected:'needs_review'},
 {template:{...base,needsReview:true},response:['A'],expected:'needs_review'}];
 for(const f of fixtures){const t=parseActivity(f.template);const result=scoreActivity(t,f.response);expect(result.outcome).toBe(f.expected);expect(result.authoritativeGrade).toBe(false);expect(t.provenance.providerId).toBe('synthetic-evaluation');expect(t.sources[0]?.revision).toBe(1);if(result.outcome==='needs_review')expect(result.score).toBeNull();}
 expect(()=>scoreActivity(base,['invented'])).toThrow();
 expect(()=>scoreActivity(fixtures[2]!.template,['A','A'])).toThrow();
 const feedback=scoreActivity(base,['A']);expect(nextReview('2026-09-20T00:00:00Z',10,feedback,true).intervalDays).toBe(1);
});
