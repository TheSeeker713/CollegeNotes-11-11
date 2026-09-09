// Dependency-free planning validation. This does not execute product tests or grant permission.
export function validateShape(value,schema,at='$') {
 const errors=[];
 const add=m=>errors.push(`${at}: ${m}`);
 if ('const' in schema && value!==schema.const)add('unexpected constant');
 if (schema.enum&&!schema.enum.includes(value))add('unrecognized value');
 const types={object:v=>v!==null&&typeof v==='object'&&!Array.isArray(v),array:Array.isArray,string:v=>typeof v==='string',boolean:v=>typeof v==='boolean',integer:Number.isInteger};
 if(schema.type&&(!types[schema.type]||!types[schema.type](value))){add(`expected ${schema.type}`);return errors;}
 if(typeof value==='number'){if(schema.minimum!==undefined&&value<schema.minimum)add('below minimum');if(schema.maximum!==undefined&&value>schema.maximum)add('above maximum');}
 if(typeof value==='string'){if(schema.minLength&&value.length<schema.minLength)add('too short');if(schema.pattern&&!new RegExp(schema.pattern).test(value))add('invalid pattern');}
 if(Array.isArray(value)){if(schema.minItems&&value.length<schema.minItems)add('too few items');if(schema.items)value.forEach((x,i)=>errors.push(...validateShape(x,schema.items,`${at}[${i}]`)));}
 if(value&&typeof value==='object'&&!Array.isArray(value)){
  for(const key of schema.required||[])if(!(key in value))add(`missing ${key}`);
  for(const [key,v]of Object.entries(value)){const sub=schema.properties?.[key]||schema.additionalProperties;if(sub&&typeof sub==='object')errors.push(...validateShape(v,sub,`${at}.${key}`));}
 }
 return errors;
}

export function authorizePhase(state,phase,approvals,{previousComplete=false,previousAccepted=false}={}) {
 const auth=approvals.entries.find(x=>x.id===state.authorization_ref&&x.kind==='phase_authorization');
 if(!auth||!auth.quote||!auth.source||!auth.phases.includes(phase))return {allowed:false,reason:'missing actual phase authorization'};
 if(auth.pass_id&&(state.pass_closed||state.pass_id!==auth.pass_id))return {allowed:false,reason:'bounded pass closed or mismatch'};
 if(phase===3&&state.phase_3_authorized===false)return {allowed:false,reason:'Phase 3 explicitly forbidden'};
 if(!previousComplete)return {allowed:false,reason:'previous phase incomplete'};
 const exception=auth.boundary_exception?.from===phase-1&&auth.boundary_exception?.to===phase;
 if(!previousAccepted&&!exception)return {allowed:false,reason:'previous phase acceptance missing'};
 return {allowed:true,reason:exception?'explicit bounded boundary exception':'authorized phase'};
}

export function evidenceGate(requiredIds,results,{sourceMatches,auditResolved,mode='real'}={}) {
 const errors=[];
 if(!requiredIds.length)errors.push('zero required cases');
 if(new Set(requiredIds).size!==requiredIds.length)errors.push('duplicate required IDs');
 if(new Set(results.map(x=>x.id)).size!==results.length)errors.push('duplicate results');
 if(results.length!==requiredIds.length)errors.push('missing or unexpected case count');
 for(const id of requiredIds){const r=results.find(x=>x.id===id);if(!r||r.status!=='passed'||r.exit_code!==0||!r.evidence_hash||r.synthetic!==(mode==='synthetic'))errors.push(`incomplete or wrong-kind evidence: ${id}`);}
 if(results.some(x=>!requiredIds.includes(x.id)))errors.push('unexpected check ID');
 if(!sourceMatches)errors.push('stale source');
 if(!auditResolved)errors.push('unresolved audit');
 return {passed:errors.length===0,errors};
}

const transitions={not_started:['in_progress'],in_progress:['verifying','blocked'],verifying:['repairing','auditing','blocked'],repairing:['verifying','blocked'],auditing:['repairing','checkpoint_pending','blocked'],checkpoint_pending:['complete','repairing','blocked'],blocked:['in_progress','repairing'],complete:['repairing']};
export function transitionStep(from,to,{gatePassed=false,checkpointCommit=null,remoteCommit=null}={}) {
 if(!transitions[from]?.includes(to))return {allowed:false,reason:'invalid transition'};
 if(to==='checkpoint_pending'&&!gatePassed)return {allowed:false,reason:'local gate incomplete'};
 if(to==='complete'&&(!gatePassed||!/^[a-f0-9]{40}$/.test(checkpointCommit||'')||checkpointCommit!==remoteCommit))return {allowed:false,reason:'checkpoint/evidence incomplete'};
 return {allowed:true,reason:'valid transition'};
}
