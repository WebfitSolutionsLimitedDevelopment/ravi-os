'use client'

import { FormEvent, useEffect, useState } from 'react'
import { BrainCircuit, Mic, MicOff, Send, ShieldCheck, X } from 'lucide-react'

type Result={domain:string;intent:string;summary:string;confidence:number;riskLevel:string;requiresApproval:boolean;payload:any;actionId?:string}

export default function GlobalRaviVoice(){
  const[open,setOpen]=useState(false);const[listening,setListening]=useState(false);const[text,setText]=useState('');const[result,setResult]=useState<Result|null>(null);const[busy,setBusy]=useState(false);const[message,setMessage]=useState('')
  const[path,setPath]=useState('')
  useEffect(()=>setPath(window.location.pathname),[])
  if(path.startsWith('/geet'))return null

  async function interpret(input:string,source:'voice'|'text'){
    const q=input.trim();if(!q)return;setBusy(true);setMessage('Understanding…');setResult(null)
    try{const r=await fetch('/api/intelligence/interpret',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:q,source})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not understand that');setResult(d);setMessage('')}catch(e){setMessage(e instanceof Error?e.message:'Could not understand that')}finally{setBusy(false)}
  }
  function startVoice(){const W=window as any;const SR=W.SpeechRecognition||W.webkitSpeechRecognition;if(!SR){setMessage('Voice recognition is not available in this browser. Type your command below.');setOpen(true);return}const r=new SR();r.lang='en-NZ';r.interimResults=false;r.continuous=false;r.onstart=()=>{setOpen(true);setListening(true);setMessage('Listening…')};r.onend=()=>setListening(false);r.onerror=()=>{setListening(false);setMessage('I could not hear that clearly. Try again or type it.')};r.onresult=(e:any)=>{const q=String(e.results?.[0]?.[0]?.transcript||'').trim();setText(q);if(q)interpret(q,'voice')};r.start()}
  function submit(e:FormEvent){e.preventDefault();interpret(text,'text')}
  function route(){if(!result)return;sessionStorage.setItem('ravi-os-intelligence-draft',JSON.stringify(result));const map:Record<string,string>={finance:'/finance?ai=1',tasks:'/tasks',journal:'/journal?new=1',family:'/family',projects:'/construction',email:'/',career:'/',health:'/'};window.location.assign(map[result.domain]||'/')}
  const canRoute=result&&['finance','tasks','journal','family','projects'].includes(result.domain)

  return <>
    <button className="raviVoiceFab" aria-label="Ravi voice assistant" onClick={()=>open?setOpen(false):startVoice()}>{listening?<MicOff/>:<Mic/>}</button>
    {open&&<div className="raviVoiceBackdrop" onClick={()=>setOpen(false)}><section className="raviVoicePanel" onClick={e=>e.stopPropagation()}><header><span><BrainCircuit/><div><small>RAVI INTELLIGENCE</small><b>What should I manage?</b></div></span><button onClick={()=>setOpen(false)}><X/></button></header><form onSubmit={submit}><textarea autoFocus value={text} onChange={e=>setText(e.target.value)} placeholder="Speak or type: ‘Spent $45 on groceries’, ‘Remind me to call contractor Friday’, ‘Note this decision…’"/><button disabled={busy||!text.trim()}><Send/>{busy?'Thinking…':'Understand'}</button></form>{message&&<p className="raviVoiceMessage">{message}</p>}{result&&<div className="raviVoiceResult"><div className="raviVoiceMeta"><span>{result.domain}</span><span>{Math.round((result.confidence||0)*100)}% confidence</span><span>{result.riskLevel} risk</span></div><h3>{result.summary}</h3><p><ShieldCheck/> {result.requiresApproval?'Approval required before action.':'Low-risk suggestion. Review still available.'}</p>{canRoute?<button onClick={route}>Review in {result.domain==='projects'?'Projects':result.domain.charAt(0).toUpperCase()+result.domain.slice(1)}</button>:<small>This intent is captured in the intelligence log. Its execution workflow will be connected in the relevant module.</small>}</div>}<footer>Ravi OS never sends email, moves money or commits a high-risk action from voice alone.</footer></section></div>}
  </>
}
