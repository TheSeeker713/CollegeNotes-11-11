import {useRef} from 'react';
export function EpubFrame({html,zoom,spacing=1.7,scrollTop=0,onScroll}:{html:string;zoom:number;spacing?:number;scrollTop?:number;onScroll?:(top:number)=>void}){
 const latest=useRef({scrollTop,onScroll});latest.current={scrollTop,onScroll};
 return <iframe title="Safe original EPUB chapter" sandbox="allow-same-origin" onLoad={e=>{const w=e.currentTarget.contentWindow;if(!w)return;w.scrollTo(0,latest.current.scrollTop);w.addEventListener('scroll',()=>latest.current.onScroll?.(w.scrollY));}} srcDoc={`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><style>body{font:${zoom}%/${spacing} system-ui;padding:1rem;color:#171717;background:#fff}img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid;padding:.4rem}pre{white-space:pre-wrap}</style>${html}`}/>;
}
