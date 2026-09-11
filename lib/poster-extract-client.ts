'use client'

import { parsePosterSemantics } from './reminder-poster-parser'
import { readPosterText } from './poster-ocr-client'

export type PosterFields={title:string;date:string;time:string;venue:string;address:string;confidence:number;imageDataUrl:string;method:'vision'|'ocr'}

function fileDataUrl(file:File):Promise<string>{return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(new Error('Unable to read image'));r.readAsDataURL(file)})}

export async function extractPosterFields(file:File):Promise<PosterFields>{
  const imageDataUrl=await fileDataUrl(file)
  try{
    const response=await fetch('/api/poster-extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:imageDataUrl})})
    if(response.ok){const p=await response.json();return{title:String(p.title||''),date:String(p.date||''),time:String(p.time||''),venue:String(p.venue||''),address:String(p.address||''),confidence:Number(p.confidence||0),imageDataUrl,method:'vision'}}
  }catch{}
  const raw=await readPosterText(file);const p=parsePosterSemantics(raw)
  return{...p,confidence:p.title!=='Event reminder'&&p.date&&p.time?.length?0.55:0.3,imageDataUrl,method:'ocr'}
}
