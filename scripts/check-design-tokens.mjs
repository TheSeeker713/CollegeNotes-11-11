import fs from 'node:fs';
import assert from 'node:assert/strict';
export function contrast(a,b){
 const luminance=h=>{if(!/^#[0-9a-f]{6}$/i.test(h))throw Error('Invalid opaque color');return h.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0);};
 const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
export function inspectTokens(tokens){
 const variants=['botanical-light','botanical-dark','brutalist-light','brutalist-dark'];
 assert.deepEqual(Object.keys(tokens.variants).sort(),variants.sort(),'Every selected variant is required');
 const o=tokens.contrast_obligations;
 assert.deepEqual(o.backgrounds,['canvas','surface','notes','study','listen']);
 assert.deepEqual(o.text_foregrounds,['text','secondary','accent','error','warning','success']);
 assert.deepEqual(o.control_foregrounds,['border','focus']);
 assert.equal(o.normal_text_minimum,4.5);assert.equal(o.control_minimum,3);
 assert.deepEqual(o.special_pairs,[['on_accent','accent',4.5],['title_text','title_surface',4.5],['on_selection','selection',4.5]]);
 const pairs=[];
 for(const [variant,v]of Object.entries(tokens.variants)){
  assert.equal(v.content_opacity,1,'Readable text backing is opaque');
  const add=(fg,bg,min)=>{const actual=contrast(v[fg],v[bg]);pairs.push({variant,foreground:fg,background:bg,ratio:actual,minimum:min,passed:actual>=min});};
  for(const bg of o.backgrounds){for(const fg of o.text_foregrounds)add(fg,bg,o.normal_text_minimum);for(const fg of o.control_foregrounds)add(fg,bg,o.control_minimum);}
  for(const [fg,bg,min]of o.special_pairs)add(fg,bg,min);
 }
 return pairs;
}
const tokens=JSON.parse(fs.readFileSync('docs/design/tokens.json'));const pairs=inspectTokens(tokens);
// Known-answer and negative controls ensure the obligation cannot silently shrink.
assert.equal(contrast('#000000','#FFFFFF'),21);assert.equal(contrast('#777777','#777777'),1);
assert.throws(()=>contrast('rgba(0,0,0,.5)','#FFFFFF'));
const missing=structuredClone(tokens);delete missing.variants['botanical-dark'];assert.throws(()=>inspectTokens(missing));
const weakened=structuredClone(tokens);weakened.contrast_obligations.normal_text_minimum=3;assert.throws(()=>inspectTokens(weakened));
const bad=structuredClone(tokens);bad.variants['botanical-light'].text=bad.variants['botanical-light'].surface;assert(inspectTokens(bad).some(x=>!x.passed));
const report={kind:'four-variant-design-contrast',command:'node scripts/check-design-tokens.mjs',time:new Date().toISOString(),revision:tokens.revision,counts:{required:pairs.length,executed:pairs.length,passed:pairs.filter(x=>x.passed).length},negative_and_known_answer_controls:6,pairs,note:'Semantic opaque color calculations, not a full accessibility or product test.'};
fs.mkdirSync('.local/verification/p2-finish',{recursive:true});fs.writeFileSync('.local/verification/p2-finish/contrast.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({counts:report.counts,controls:6,failures:pairs.filter(x=>!x.passed)}));
if(pairs.some(x=>!x.passed))process.exitCode=1;
