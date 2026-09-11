'use client'

import { parsePosterSemantics } from './reminder-poster-parser'
import { readPosterText } from './poster-ocr-client'

export type PosterFields={title:string;date:string;time:string;venue:string;address:string;confidence:number;imageDataUrl:string;method:'vision'|'ocr'}

function compressedDataUrl(file:File):Promise<string>{
  return new Promise((resolve,reject)=>{
    const reader=new FileReader()
    reader.onerror=()=>reject(new Error('Unable to read image'))
    reader.onload=()=>{
      const img=new Image()
      img.onerror=()=>reject(new Error('Unable to decode image'))
      img.onload=()=>{
        const max=1600
        const scale=Math.min(1,max/Math.max(img.width,img.height))
        const canvas=document.createElement('canvas')
        canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale))
        const ctx=canvas.getContext('2d');if(!ctx)return reject(new Error('Unable to process image'))
        ctx.drawImage(img,0,0,canvas.width,canvas.height)
        resolve(canvas.toDataURL('image/jpeg',0.8))
      }
      img.src=String(reader.result||'')
    }
    reader.readAsDataURL(file)
  })
}

export async function extractPosterFields(file:File):Promise<PosterFields>{
  const imageDataUrl=await compressedDataUrl(file)
  try{
    const response=await fetch('/api/poster-extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:imageDataUrl})})
    if(response.ok){const p=await response.json();return{title:String(p.title||''),date:String(p.date||''),time:String(p.time||''),venue:String(p.venue||''),address:String(p.address||''),confidence:Number(p.confidence||0),imageDataUrl,method:'vision'}}
  }catch{}
  const raw=await readPosterText(file);const p=parsePosterSemantics(raw)
  return{...p,confidence:p.title!=='Event reminder'&&p.date&&p.time?.length?0.55:0.3,imageDataUrl,method:'ocr'}
}
