export type ReadingAnchor={type:string;locator:string;textStart?:number;textEnd?:number};
export type ReadingLocation={ordinal:number;start:number;end:number;label:string;anchor:ReadingAnchor|null};
export type ReadingDocument={sourceId:string;courseId:string;filename:string;revision:number;text:string;locations:ReadingLocation[];warnings:string[];exactOriginalMapping:boolean};
export function readingLocations(text:string,anchors:ReadingAnchor[],exact:boolean):ReadingLocation[]{
 const result:ReadingLocation[]=[];
 for(let start=0;start<text.length;){let end=Math.min(text.length,start+4000);if(end<text.length){const newline=text.lastIndexOf('\n',end);if(newline>start+2000)end=newline+1;if(/[\uD800-\uDBFF]/.test(text[end-1]??''))end--;}
 const anchor=exact?anchors.find(a=>typeof a.textStart==='number'&&typeof a.textEnd==='number'&&a.textStart<=start&&a.textEnd>start)??null:null;
 const next=exact?anchors.find(a=>typeof a.textStart==='number'&&a.textStart>start&&a.textStart<end):undefined;if(next)end=next.textStart!;
 result.push({ordinal:result.length,start,end,label:anchor?.locator??`Passage ${result.length+1}`,anchor});start=end;}return result;
}
export function locationAt(locations:ReadingLocation[],offset:number){return locations.find(l=>l.start<=offset&&offset<l.end)??locations.at(-1)??null;}
export function readingMatches(text:string,query:string,limit=100):Array<{start:number;end:number}>{
 const q=query.trim();if(!q||q.length>240)return [];const pattern=new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'giu');const results=[];
 for(const match of text.matchAll(pattern)){results.push({start:match.index,end:match.index+match[0].length});if(results.length>=limit)break;}return results;
}
export function originalPage(location:ReadingLocation|null){const match=location?.anchor?.locator.match(/page:(\d+)/);return match?Number(match[1]):null;}
export type Annotation={id:string;courseId:string;sourceId:string;revision:number;kind:'highlight'|'note'|'bookmark';start:number;end:number;quote:string;note:string;version:number;createdAt:string;updatedAt:string};
export type ReadingPosition={revision:number;offset:number;view:'reflow'|'original';scrollTop:number;page:number;chapter:number;draft:string;selectionStart:number;selectionEnd:number;version:number};
export const initialReadingPosition=(revision:number):ReadingPosition=>({revision,offset:0,view:'reflow',scrollTop:0,page:1,chapter:0,draft:'',selectionStart:0,selectionEnd:0,version:0});
export function highlightedParts(text:string,start:number,end:number,ranges:Array<{start:number;end:number}>){
 const points=[...new Set([start,end,...ranges.flatMap(r=>[Math.max(start,Math.min(end,r.start)),Math.max(start,Math.min(end,r.end))])])].sort((a,b)=>a-b);
 return points.slice(0,-1).map((at,i)=>({start:at,text:text.slice(at,points[i+1]),highlighted:ranges.some(r=>r.start<=at&&r.end>at)}));
}
