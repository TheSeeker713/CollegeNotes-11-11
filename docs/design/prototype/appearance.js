// Applied before body paint. This is isolated preview state, not application storage.
window.PREVIEW_KEY='collegenotes-phase2-preview-v1';
window.savedPreview={};
try{const raw=localStorage.getItem(PREVIEW_KEY);if(raw){const parsed=JSON.parse(raw);if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))window.savedPreview=parsed;else window.previewRecovery=true;}}catch{window.previewRecovery=true;}
const defaults={theme:'botanical',mode:'light',size:'18',density:'comfortable',motion:false,transparency:false};
window.previewAppearance={...defaults,...savedPreview.appearance};
if(!['botanical','brutalist'].includes(previewAppearance.theme)||!['light','dark'].includes(previewAppearance.mode)){window.previewAppearance={...defaults};window.previewRecovery=true;}
if(!['16','18','20','22','24'].includes(String(previewAppearance.size)))previewAppearance.size='18';
if(!['comfortable','compact'].includes(previewAppearance.density))previewAppearance.density='comfortable';
window.applyAppearance=function(){
 const a=previewAppearance,t=DESIGN.tokens.variants[a.theme+'-'+a.mode],root=document.documentElement;
 root.dataset.theme=a.theme;root.dataset.mode=a.mode;root.dataset.density=a.density;
 for(const [key,value]of Object.entries(t))if(typeof value==='string')root.style.setProperty('--'+key.replaceAll('_','-'),value);
 root.style.setProperty('--font-heading',t.font_heading);root.style.setProperty('--card-radius',t.card_radius_px+'px');root.style.setProperty('--reading-size',a.size+'px');
 root.style.setProperty('--rest-shadow',DESIGN.tokens.glass.rest_shadow);root.style.setProperty('--lift-shadow',DESIGN.tokens.glass.lift_shadow);
 root.classList.toggle('reduce-motion',!!a.motion);root.classList.toggle('reduce-transparency',!!a.transparency);
};applyAppearance();
