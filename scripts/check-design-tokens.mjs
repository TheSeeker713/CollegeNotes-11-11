import fs from 'node:fs';
const tokens=JSON.parse(fs.readFileSync('docs/design/tokens.json'));
const linear=n=>{const c=n/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;};
const lum=hex=>{const rgb=hex.slice(1).match(/../g).map(x=>linear(parseInt(x,16)));return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
const pairs=[];
for(const [direction,t]of Object.entries(tokens.directions)){
 for(const bg of ['canvas','surface'])for(const fg of ['text','secondary','accent','error','warning','border','focus']){
  const threshold=['border','focus'].includes(fg)?3:4.5;const actual=ratio(t[fg],t[bg]);pairs.push({direction,foreground:fg,background:bg,hex:[t[fg],t[bg]],ratio:actual,minimum:threshold,passed:actual>=threshold});
 }
 const actual=ratio(t.on_accent,t.accent);pairs.push({direction,foreground:'on_accent',background:'accent',hex:[t.on_accent,t.accent],ratio:actual,minimum:4.5,passed:actual>=4.5});
}
const report={kind:'design-token-contrast-calculation',command:'node scripts/check-design-tokens.mjs',time:new Date().toISOString(),note:'Calculated proposal colors, not generated-image or application accessibility results.',counts:{required:45,executed:pairs.length,passed:pairs.filter(x=>x.passed).length},pairs};
fs.writeFileSync('.local/verification/design-contrast.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({counts:report.counts,failures:pairs.filter(x=>!x.passed)}));if(pairs.length!==45||pairs.some(x=>!x.passed))process.exit(1);
