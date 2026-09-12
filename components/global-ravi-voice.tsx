'use client'

import { FormEvent,useEffect,useRef,useState } from 'react'
import { BrainCircuit,CheckCircle2,Mic,MicOff,Send,ShieldCheck,Sparkles,X } from 'lucide-react'

type Result={domain:string;intent:string;summary:string;confidence:number;riskLevel:string;requiresApproval:boolean;payload:any;actionId?:string;engine?:string}
const EXECUTABLE_INTENTS=['add_finance_transaction','create_task','create_reminder','capture_note','create_waiting_for','create_family_commitment','health_log']
export default function GlobalRaviVoice(){const[open,setOpen]=useState(false);const[listening,setListening]=useState(false);const[recording,setRecording]=useState(false);const[text,setText]=useState('');const[result,setResult]=useState<Result|null>(null);const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');const[source,setSource]=useState<'voice'|'text'>('text');const[executed,setExecuted]=useState(false);const[path,setPath]=useState('');const[assistantMode,setAssistantMode]=useState(false);const[assistantStatus,setAssistantStatus]=useState('')
 const mediaRecorderRef=useRef<any>(null);const chunksRef=useRef<Blob[]>([])
 const assistantModeRef=useRef(false);const recognitionRef=useRef<any>(null);const manualStopRef=useRef(false);const iosLoopPausedRef=useRef(true);const busyAssistantRef=useRef(false);const awaitingCommandRef=useRef(false);const awaitingTimeoutRef=useRef<any>(null)
 useEffect(()=>setPath(window.location.pathname),[])
 useEffect(()=>()=>{assistantModeRef.current=false;try{recognitionRef.current?.stop()}catch{};try{window.speechSynthesis?.cancel()}catch{}},[])
 if(path.startsWith('/geet'))return null
 async function markExecuted(actionId?:string){if(actionId)await fetch(`/api/intelligence/actions/${actionId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'executed'})})}
 async function autoReminder(d:Result,nextSource:'voice'|'text'){const p=d.payload||{};if(d.intent!=='create_reminder'||d.requiresApproval||!p.title||!p.date||!p.time)return false;setMessage('Setting the reminder…');const r=await fetch('/api/reminders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:p.title,notes:p.notes||'',date:p.date,time:p.time,dueAt:new Date(`${p.date}T${p.time}:00`).toISOString(),source:nextSource})});const out=await r.json().catch(()=>({}));if(!r.ok)throw new Error(out.error||'Could not set the reminder');await markExecuted(d.actionId);setExecuted(true);setMessage(`Done. Reminder set for ${p.date} at ${p.time}.`);return true}
 async function interpret(input:string,nextSource:'voice'|'text'){const q=input.trim();if(!q)return;setSource(nextSource);setBusy(true);setExecuted(false);setMessage('Understanding…');setResult(null);try{const r=await fetch('/api/intelligence/interpret',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:q,source:nextSource})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not understand that');setResult(d);setMessage('');await autoReminder(d,nextSource)}catch(e){setMessage(e instanceof Error?e.message:'Could not understand that')}finally{setBusy(false)}}
 function startSpeechRecognition(SR:any){const r=new SR();r.lang='en-NZ';r.interimResults=false;r.continuous=false;r.onstart=()=>{setOpen(true);setListening(true);setMessage('Listening…')};r.onend=()=>setListening(false);r.onerror=(e:any)=>{setListening(false);const err=e?.error;if(err==='not-allowed'||err==='service-not-allowed')setMessage('Microphone access is blocked for this site. Allow the microphone permission for this site in your browser settings, then try again.');else if(err==='no-speech')setMessage("I didn't hear anything. Tap the mic and try again.");else setMessage('I could not hear that clearly. Try again or type it.')};r.onresult=(e:any)=>{const q=String(e.results?.[0]?.[0]?.transcript||'').trim();setText(q);if(q)interpret(q,'voice')};try{r.start()}catch{setListening(false);setMessage('Could not start listening. Try again or type it.')}}
 async function startRecording(){
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true})
   const MR=(window as any).MediaRecorder
   const mimeType=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(t=>MR.isTypeSupported?.(t))||''
   const mr=new MR(stream,mimeType?{mimeType}:undefined)
   chunksRef.current=[]
   mr.ondataavailable=(e:any)=>{if(e.data&&e.data.size>0)chunksRef.current.push(e.data)}
   mr.onstop=async()=>{
    stream.getTracks().forEach((t:any)=>t.stop())
    setListening(false);setRecording(false)
    const blob=new Blob(chunksRef.current,{type:mr.mimeType||mimeType||'audio/webm'})
    if(blob.size<800){setMessage('That was too quick — tap the mic and speak right after.');return}
    setBusy(true);setMessage('Transcribing…')
    try{
     const fd=new FormData();fd.append('audio',blob,'voice.webm')
     const r=await fetch('/api/intelligence/transcribe',{method:'POST',body:fd})
     const d=await r.json().catch(()=>({}))
     if(!r.ok)throw new Error(d.error||'Could not transcribe that recording')
     setText(d.text)
     await interpret(d.text,'voice')
    }catch(e){setMessage(e instanceof Error?e.message:'Could not transcribe that recording')}finally{setBusy(false)}
   }
   mediaRecorderRef.current=mr
   mr.start()
   setOpen(true);setListening(true);setRecording(true);setMessage('Listening… tap the mic again to stop and send.')
  }catch(e:any){
   setOpen(true)
   if(e?.name==='NotAllowedError'||e?.name==='SecurityError')setMessage('Microphone access was blocked. Allow microphone access for this site in your phone browser settings, then try again — or just type your command below.')
   else setMessage("Couldn't access the microphone on this device. Type your command below, or use your keyboard's dictation button.")
  }
 }
 function stopRecording(){const mr=mediaRecorderRef.current;if(mr&&mr.state!=='inactive')mr.stop();else setRecording(false)}
 function startVoice(){
  if(recording){stopRecording();return}
  const W=window as any,SR=W.SpeechRecognition||W.webkitSpeechRecognition
  if(SR)return startSpeechRecognition(SR)
  const nav:any=navigator
  if(nav.mediaDevices&&typeof nav.mediaDevices.getUserMedia==='function'&&(window as any).MediaRecorder)return startRecording()
  setOpen(true);setMessage("Voice input isn't supported in this browser. Tap the box below and use your keyboard's mic/dictation key to speak, or just type your command.")
 }
 function submit(e:FormEvent){e.preventDefault();interpret(text,'text')}
 async function execute(overrideResult?:Result):Promise<{ok:boolean;spoken:string}>{
  const active=overrideResult||result
  if(!active)return{ok:false,spoken:''}
  const p=active.payload||{};let url='',body:any={}
  if(active.intent==='add_finance_transaction'){const amount=Number(p.amount);if(!(amount>=0)){const m='I need a valid amount before recording this.';setMessage(m);return{ok:false,spoken:m}}url='/api/finance';body={kind:'transaction',type:p.type||'expense',amount,currency:String(p.currency||'NZD').toUpperCase(),baseAmountNzd:String(p.currency||'NZD').toUpperCase()==='NZD'?amount:undefined,category:p.category||'Other',merchant:p.merchant||'',date:p.date||undefined,notes:p.notes||'',source,confidence:active.confidence,riskLevel:active.riskLevel,aiActionId:active.actionId||undefined}}
  else if(active.intent==='create_task'){url='/api/tasks';body={title:p.title,notes:p.notes||'',dueDate:p.dueDate||null,dueTime:p.dueTime||null,priority:p.priority||'medium',category:p.category||'Personal'}}
  else if(active.intent==='create_reminder'){if(!p.title||!p.date||!p.time){const m='A reminder needs title, date and time before I can save it.';setMessage(m);return{ok:false,spoken:m}}url='/api/reminders';body={title:p.title,notes:p.notes||'',date:p.date,time:p.time,dueAt:new Date(`${p.date}T${p.time}:00`).toISOString(),source}}
  else if(active.intent==='capture_note'){url='/api/journal';body={action:'entry_create',entryType:p.type||'note',title:p.title||'',body:p.content||active.summary,tags:Array.isArray(p.tags)?p.tags:[]}}
  else if(active.intent==='create_waiting_for'){url='/api/waiting-for';body={title:p.title,person:p.person||p.organisation||'',notes:p.organisation&&p.person?`Organisation: ${p.organisation}`:'',dueDate:p.followUpDate||null,dueTime:p.followUpTime||null,priority:p.priority||'medium',channel:p.channel||''}}
  else if(active.intent==='create_family_commitment'){url='/api/family';body={title:p.title,notes:p.notes||'',date:p.eventDate||null,time:p.eventTime||null,category:p.category||'Family',assignedTo:p.assignedTo||'family',priority:p.priority||'medium'}}
  else if(active.intent==='health_log'){url='/api/health';body={metric:{metric_date:p.date||new Date().toISOString().slice(0,10),source:'voice',sleep_hours:p.sleepHours??null,steps:p.steps??null,protein_g:p.proteinG??null,water_ml:p.waterMl??null,exercise_minutes:p.exerciseMinutes??null,weight_kg:p.weightKg??null,notes:p.notes||''}}}
  else{route();return{ok:true,spoken:active.summary}}
  setBusy(true);setMessage('Executing the approved action…')
  try{
   const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json().catch(()=>({}))
   if(!r.ok)throw new Error(d.error||'Action failed')
   await markExecuted(active.actionId);setExecuted(true)
   setMessage('Done. The action was completed and recorded in the audit trail.')
   return{ok:true,spoken:`Done. ${active.summary}`}
  }catch(e){
   const m=e instanceof Error?e.message:'Action failed';setMessage(m)
   return{ok:false,spoken:`Sorry, that failed. ${m}`}
  }finally{setBusy(false)}
 }
 function route(){if(!result)return;sessionStorage.setItem('ravi-os-intelligence-draft',JSON.stringify(result));const map:Record<string,string>={finance:'/finance?ai=1',tasks:'/tasks',journal:'/journal?new=1',family:'/family',projects:'/construction',email:'/secretary',career:'/career',health:'/health',general:'/automation'};window.location.assign(map[result.domain]||'/')}
 const executable=result&&EXECUTABLE_INTENTS.includes(result.intent)

 // ---- "Hey Ravi" always-on assistant mode ----
 function speak(text:string):Promise<void>{
  return new Promise(resolve=>{
   pauseListening()
   if(!('speechSynthesis' in window)){resumeListening();resolve();return}
   try{window.speechSynthesis.cancel()}catch{}
   const u=new SpeechSynthesisUtterance(text)
   u.lang='en-NZ'
   u.onend=()=>{resumeListening();resolve()}
   u.onerror=()=>{resumeListening();resolve()}
   window.speechSynthesis.speak(u)
  })
 }
 function pauseListening(){manualStopRef.current=true;iosLoopPausedRef.current=true;try{recognitionRef.current?.stop()}catch{}}
 function resumeListening(){
  if(!assistantModeRef.current)return
  manualStopRef.current=false;iosLoopPausedRef.current=false
  const W=window as any,SR=W.SpeechRecognition||W.webkitSpeechRecognition
  if(SR&&recognitionRef.current){try{recognitionRef.current.start();setListening(true)}catch{}}
  else if(!SR){iosLoopStep()}
 }
 async function runAssistantCommand(commandText:string){
  const q=commandText.trim();if(!q)return
  setAssistantStatus('Working…')
  try{
   const r=await fetch('/api/intelligence/interpret',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:q,source:'voice'})})
   const d=await r.json()
   if(!r.ok)throw new Error(d.error||'Could not understand that')
   setResult(d);setSource('voice');setExecuted(false)
   if(EXECUTABLE_INTENTS.includes(d.intent)){
    const outcome=await execute(d)
    setAssistantStatus(outcome.spoken)
    await speak(outcome.spoken)
   }else{
    const spoken=`${d.summary} You'll need to review this one in the app.`
    setAssistantStatus(spoken)
    await speak(spoken)
   }
  }catch(e){
   const m=e instanceof Error?e.message:'Could not understand that'
   setAssistantStatus(m)
   await speak(`Sorry. ${m}`)
  }
  if(assistantModeRef.current)setAssistantStatus('Listening for "Hey Ravi"…')
 }
 async function handleHeardText(transcript:string){
  const t=transcript.trim();if(!t)return
  if(busyAssistantRef.current)return
  if(awaitingCommandRef.current){
   awaitingCommandRef.current=false;clearTimeout(awaitingTimeoutRef.current)
   busyAssistantRef.current=true;await runAssistantCommand(t);busyAssistantRef.current=false
   return
  }
  const m=t.match(/^\s*(?:hey|hi|ok(?:ay)?)?[,]?\s*ravi\b[,.:]?\s*(.*)$/i)
  if(!m)return
  const rest=m[1].trim()
  if(rest){
   busyAssistantRef.current=true;await runAssistantCommand(rest);busyAssistantRef.current=false
  }else{
   setAssistantStatus('Yes? Listening for your command…')
   await speak('Yes?')
   awaitingCommandRef.current=true
   clearTimeout(awaitingTimeoutRef.current)
   awaitingTimeoutRef.current=setTimeout(()=>{awaitingCommandRef.current=false;if(assistantModeRef.current)setAssistantStatus('Listening for "Hey Ravi"…')},8000)
  }
 }
 async function iosLoopStep(){
  if(!assistantModeRef.current||iosLoopPausedRef.current)return
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true})
   const MR=(window as any).MediaRecorder
   const mimeType=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(t=>MR.isTypeSupported?.(t))||''
   const mr=new MR(stream,mimeType?{mimeType}:undefined)
   const chunks:Blob[]=[]
   mr.ondataavailable=(e:any)=>{if(e.data&&e.data.size>0)chunks.push(e.data)}
   const stopped=new Promise<void>(res=>{mr.onstop=()=>res()})
   mr.start()
   await new Promise(res=>setTimeout(res,4000))
   if(mr.state!=='inactive')mr.stop()
   await stopped
   stream.getTracks().forEach((t:any)=>t.stop())
   if(!assistantModeRef.current)return
   const blob=new Blob(chunks,{type:mr.mimeType||mimeType||'audio/webm'})
   if(blob.size>800){
    const fd=new FormData();fd.append('audio',blob,'chunk.webm')
    const r=await fetch('/api/intelligence/transcribe',{method:'POST',body:fd})
    const d=await r.json().catch(()=>({}))
    if(r.ok&&d.text)await handleHeardText(String(d.text))
   }
  }catch{
   setAssistantStatus("Couldn't access the microphone. Assistant mode stopped.")
   stopAssistantMode();return
  }
  if(assistantModeRef.current&&!iosLoopPausedRef.current)iosLoopStep()
 }
 async function startAssistantMode(){
  if(assistantModeRef.current)return
  assistantModeRef.current=true;setAssistantMode(true);iosLoopPausedRef.current=false
  setAssistantStatus('Listening for "Hey Ravi"…')
  const W=window as any,SR=W.SpeechRecognition||W.webkitSpeechRecognition
  if(SR){
   const recog=new SR()
   recog.lang='en-NZ';recog.continuous=true;recog.interimResults=true
   recog.onresult=(e:any)=>{for(let i=e.resultIndex;i<e.results.length;i++){const res=e.results[i];if(!res.isFinal)continue;const t=String(res[0]?.transcript||'').trim();if(t)handleHeardText(t)}}
   recog.onerror=(e:any)=>{const err=e?.error;if(err==='not-allowed'||err==='service-not-allowed'){setAssistantStatus('Microphone access is blocked. Allow the microphone for this site, then turn assistant mode on again.');stopAssistantMode()}}
   recog.onend=()=>{setListening(false);if(assistantModeRef.current&&!manualStopRef.current){try{recog.start();setListening(true)}catch{}}}
   recognitionRef.current=recog
   try{recog.start();setListening(true)}catch{setAssistantStatus('Could not start listening.');stopAssistantMode();return}
   speak('Assistant mode is on. Say Hey Ravi any time.')
  }else{
   const nav:any=navigator
   if(nav.mediaDevices&&typeof nav.mediaDevices.getUserMedia==='function'&&(window as any).MediaRecorder){
    await speak('Assistant mode is on. Say Hey Ravi any time. This uses live transcription continuously while switched on.')
    iosLoopStep()
   }else{
    setAssistantStatus("This browser can't listen continuously. Use the mic button for one command at a time.")
    assistantModeRef.current=false;setAssistantMode(false)
   }
  }
 }
 function stopAssistantMode(){
  assistantModeRef.current=false;setAssistantMode(false);manualStopRef.current=true;iosLoopPausedRef.current=true
  awaitingCommandRef.current=false;clearTimeout(awaitingTimeoutRef.current)
  try{recognitionRef.current?.stop()}catch{}
  recognitionRef.current=null;setListening(false);setAssistantStatus('')
  try{window.speechSynthesis?.cancel()}catch{}
 }

 return <>
  <button type="button" className={`raviVoiceFab${recording?' raviVoiceFabRecording':''}`} aria-label="Ravi voice assistant" onClick={()=>{if(recording){stopRecording();return}if(assistantMode){setOpen(o=>!o);return}if(open){setOpen(false);return}startVoice()}}>{listening?<MicOff/>:<Mic/>}</button>
  <button type="button" className={`raviAssistantToggle${assistantMode?' raviAssistantToggleOn':''}`} aria-label="Toggle Hey Ravi assistant mode" onClick={()=>assistantMode?stopAssistantMode():startAssistantMode()}><Sparkles/></button>
  {assistantMode&&assistantStatus&&<div className="raviAssistantStatus">{assistantStatus}</div>}
  {open&&<div className="raviVoiceBackdrop" onClick={()=>{if(!recording)setOpen(false)}}><section className="raviVoicePanel" onClick={e=>e.stopPropagation()}><header><span><BrainCircuit/><div><small>RAVI INTELLIGENCE</small><b>What should I manage?</b></div></span><button type="button" onClick={()=>{if(recording)stopRecording();setOpen(false)}}><X/></button></header><form onSubmit={submit}><textarea autoFocus value={text} onChange={e=>setText(e.target.value)} placeholder="Try: ‘Remind me Monday morning to call the cricket association’, ‘Spent $45 on groceries’, ‘I am waiting for John’. On a phone, your keyboard's own mic/dictation key works here too."/><button disabled={busy||!text.trim()}><Send/>{busy?'Working…':'Understand'}</button></form>{message&&<p className="raviVoiceMessage">{message}</p>}{result&&<div className="raviVoiceResult"><div className="raviVoiceMeta"><span>{result.domain}</span><span>{Math.round((result.confidence||0)*100)}% confidence</span><span>{result.riskLevel} risk</span></div><h3>{result.summary}</h3>{executed?<p><CheckCircle2/> Completed and recorded.</p>:<p><ShieldCheck/> {result.requiresApproval?'Approval required before action.':'Safe action can be completed automatically.'}</p>}{!executed&&executable&&result.requiresApproval&&<button onClick={()=>execute()}><CheckCircle2/>Approve & execute</button>}{executed&&<button onClick={route}><CheckCircle2/>Open {result.domain==='tasks'?'Reminders / Tasks':result.domain}</button>}{!executable&&<button onClick={route}>Review in {result.domain==='email'?'Personal Secretary':result.domain.charAt(0).toUpperCase()+result.domain.slice(1)}</button>}</div>}<footer>Say "Hey Ravi" (tap the sparkle button once to turn on) for hands-free capture — it now executes finance, tasks, reminders, family, health and notes automatically and replies out loud. Email sends, money movement and other consequential actions remain explicitly gated.</footer></section></div>}
 </>
}
