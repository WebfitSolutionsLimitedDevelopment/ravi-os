'use client'

import { FormEvent,useEffect,useRef,useState } from 'react'
import { BrainCircuit,CheckCircle2,Mic,MicOff,Send,ShieldCheck,Sparkles,X } from 'lucide-react'

type Result={domain:string;intent:string;summary:string;confidence:number;riskLevel:string;requiresApproval:boolean;payload:any;actionId?:string;engine?:string}
const EXECUTABLE_INTENTS=['add_finance_transaction','create_task','create_reminder','capture_note','create_waiting_for','create_family_commitment','health_log']

// Simple volume-based voice-activity detection: watches the mic stream and
// resolves once the person has spoken and then paused, instead of cutting
// them off after a fixed short window.
function watchForSilence(stream:MediaStream,opts:{maxMs?:number;silenceMs?:number;minSpeechMs?:number;shouldAbort?:()=>boolean}={}):Promise<void>{
 const maxMs=opts.maxMs??60000,silenceMs=opts.silenceMs??1600,minSpeechMs=opts.minSpeechMs??300,THRESH=0.025
 return new Promise(resolve=>{
  const AC=(window as any).AudioContext||(window as any).webkitAudioContext
  if(!AC){setTimeout(resolve,Math.min(maxMs,6000));return}
  const ctx=new AC();const src=ctx.createMediaStreamSource(stream);const analyser=ctx.createAnalyser();analyser.fftSize=512;src.connect(analyser)
  const data=new Uint8Array(analyser.frequencyBinCount)
  let speechStarted=false,lastLoudAt=Date.now();const startedAt=Date.now()
  const finish=()=>{try{ctx.close()}catch{};resolve()}
  const tick=()=>{
   if(opts.shouldAbort?.()){finish();return}
   analyser.getByteTimeDomainData(data)
   let sum=0;for(let i=0;i<data.length;i++){const v=(data[i]-128)/128;sum+=v*v}
   const rms=Math.sqrt(sum/data.length);const now=Date.now()
   if(rms>THRESH){lastLoudAt=now;if(!speechStarted&&now-startedAt>minSpeechMs)speechStarted=true}
   if((speechStarted&&now-lastLoudAt>silenceMs)||now-startedAt>maxMs){finish();return}
   requestAnimationFrame(tick)
  }
  tick()
 })
}

function todayNZClient(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function fmtTime12(t:string){if(!t)return'';const[h,m]=t.split(':').map(Number);if(Number.isNaN(h))return t;const hh=((h+11)%12)+1;const ap=h<12?'AM':'PM';return `${hh}:${String(m||0).padStart(2,'0')} ${ap}`}

// Answers a read-only "what's on / how much / any tasks" style question by
// fetching the real data from the relevant module — never invented.
async function answerQuery(topic:string,scope:string):Promise<string>{
 const today=todayNZClient()
 try{
  if(topic==='reminders'){
   const r=await fetch('/api/reminders');const d=await r.json().catch(()=>({}));const list=Array.isArray(d.reminders)?d.reminders:[]
   const filtered=scope==='today'?list.filter((x:any)=>x.date===today):list.filter((x:any)=>x.date>=today)
   const sorted=[...filtered].sort((a:any,b:any)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
   if(!sorted.length)return scope==='today'?"You don't have any reminders today.":"You don't have any upcoming reminders."
   const items=sorted.slice(0,5).map((x:any)=>`${x.title}${x.time?` at ${fmtTime12(x.time)}`:''}${scope!=='today'&&x.date!==today?` on ${x.date}`:''}`)
   return `You have ${sorted.length} reminder${sorted.length===1?'':'s'}${scope==='today'?' today':''}: ${items.join('; ')}.`
  }
  if(topic==='tasks'){
   const r=await fetch('/api/tasks');const d=await r.json().catch(()=>({}));const list=Array.isArray(d.tasks)?d.tasks:[]
   const open=list.filter((x:any)=>x.status==='open')
   const filtered=scope==='today'?open.filter((x:any)=>x.dueDate===today):open
   if(!filtered.length)return scope==='today'?"You have no tasks due today.":"You have no open tasks."
   const items=filtered.slice(0,6).map((x:any)=>`${x.title}${x.priority==='high'?' — high priority':''}`)
   return `You have ${filtered.length} open task${filtered.length===1?'':'s'}${scope==='today'?' due today':''}: ${items.join('; ')}.`
  }
  if(topic==='waiting_for'){
   const r=await fetch('/api/waiting-for');const d=await r.json().catch(()=>({}));const list=Array.isArray(d.items)?d.items:[]
   const waiting=list.filter((x:any)=>x.status==='waiting')
   if(!waiting.length)return "You're not waiting on anything right now."
   const items=waiting.slice(0,6).map((x:any)=>`${x.person?`${x.person} about `:''}${x.title}`)
   return `You're waiting on ${waiting.length} thing${waiting.length===1?'':'s'}: ${items.join('; ')}.`
  }
  if(topic==='health'){
   const r=await fetch('/api/health');const d=await r.json().catch(()=>({}));const list=Array.isArray(d.metrics)?d.metrics:[]
   const latest=list[0]
   if(!latest)return "You haven't logged any health data yet."
   const bits:string[]=[]
   if(latest.sleep_hours)bits.push(`${latest.sleep_hours} hours of sleep`)
   if(latest.steps)bits.push(`${Number(latest.steps).toLocaleString()} steps`)
   if(latest.protein_g)bits.push(`${latest.protein_g} grams of protein`)
   if(latest.water_ml)bits.push(`${latest.water_ml} milliliters of water`)
   if(latest.exercise_minutes)bits.push(`${latest.exercise_minutes} minutes of exercise`)
   return bits.length?`Your last check-in was on ${latest.metric_date}: ${bits.join(', ')}.`:`Your last check-in was on ${latest.metric_date}, but no details were logged.`
  }
  if(topic==='finance'){
   const r=await fetch('/api/finance');const d=await r.json().catch(()=>({}));const list=Array.isArray(d.transactions)?d.transactions:[]
   const todays=list.filter((x:any)=>x.date===today)
   const relevant=scope==='today'?todays:list.slice(0,5)
   if(!relevant.length)return scope==='today'?"You have no transactions recorded today.":"I couldn't find any recent transactions."
   const spend=relevant.filter((x:any)=>x.type==='expense').reduce((s:number,x:any)=>s+Number(x.amount||0),0)
   const items=relevant.slice(0,5).map((x:any)=>`${x.type} of ${x.currency||'NZD'} ${Number(x.amount||0).toFixed(2)}${x.merchant?` at ${x.merchant}`:''}`)
   const totalLine=scope==='today'&&spend>0?` Total spent today: ${relevant[0]?.currency||'NZD'} ${spend.toFixed(2)}.`:''
   return `${items.join('; ')}.${totalLine}`
  }
 }catch{}
 return "I couldn't fetch that information right now."
}

export default function GlobalRaviVoice(){const[open,setOpen]=useState(false);const[listening,setListening]=useState(false);const[recording,setRecording]=useState(false);const[text,setText]=useState('');const[result,setResult]=useState<Result|null>(null);const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');const[source,setSource]=useState<'voice'|'text'>('text');const[executed,setExecuted]=useState(false);const[path,setPath]=useState('');const[assistantMode,setAssistantMode]=useState(false);const[assistantStatus,setAssistantStatus]=useState('')
 const mediaRecorderRef=useRef<any>(null);const chunksRef=useRef<Blob[]>([])
 const oneShotRecognitionRef=useRef<any>(null)
 const assistantModeRef=useRef(false);const recognitionRef=useRef<any>(null);const manualStopRef=useRef(false);const iosLoopPausedRef=useRef(true);const busyAssistantRef=useRef(false);const awaitingCommandRef=useRef(false);const awaitingTimeoutRef=useRef<any>(null)
 useEffect(()=>setPath(window.location.pathname),[])
 useEffect(()=>()=>{assistantModeRef.current=false;try{recognitionRef.current?.stop()}catch{};try{oneShotRecognitionRef.current?.stop()}catch{};try{window.speechSynthesis?.cancel()}catch{}},[])
 if(path.startsWith('/geet'))return null
 async function markExecuted(actionId?:string){if(actionId)await fetch(`/api/intelligence/actions/${actionId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'executed'})})}
 async function autoReminder(d:Result,nextSource:'voice'|'text'){const p=d.payload||{};if(d.intent!=='create_reminder'||d.requiresApproval||!p.title||!p.date||!p.time)return false;setMessage('Setting the reminder…');const r=await fetch('/api/reminders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:p.title,notes:p.notes||'',date:p.date,time:p.time,dueAt:new Date(`${p.date}T${p.time}:00`).toISOString(),source:nextSource})});const out=await r.json().catch(()=>({}));if(!r.ok)throw new Error(out.error||'Could not set the reminder');await markExecuted(d.actionId);setExecuted(true);setMessage(`Done. Reminder set for ${p.date} at ${p.time}.`);return true}
 async function interpret(input:string,nextSource:'voice'|'text'){
  const q=input.trim();if(!q)return
  setSource(nextSource);setBusy(true);setExecuted(false);setMessage('Understanding…');setResult(null)
  try{
   const r=await fetch('/api/intelligence/interpret',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:q,source:nextSource})})
   const d=await r.json()
   if(!r.ok)throw new Error(d.error||'Could not understand that')
   setResult(d)
   if(d.intent==='query_info'){
    setMessage('Checking…')
    const answer=await answerQuery(String(d.payload?.topic||''),String(d.payload?.scope||'today'))
    setMessage(answer)
    if(nextSource==='voice')await speak(answer)
    return
   }
   setMessage('')
   await autoReminder(d,nextSource)
  }catch(e){setMessage(e instanceof Error?e.message:'Could not understand that')}finally{setBusy(false)}
 }

 // One-shot mic tap (manual "Understand" flow). Listens continuously and
 // waits for a natural pause instead of cutting off after one short phrase;
 // tapping the mic again ends it early.
 function startSpeechRecognition(SR:any){
  const r=new SR()
  r.lang='en-NZ';r.interimResults=true;r.continuous=true
  let finalText='';let silenceTimer:any=null;let hardStop:any=null
  const finish=()=>{try{r.stop()}catch{}}
  const scheduleFinish=()=>{clearTimeout(silenceTimer);silenceTimer=setTimeout(finish,2200)}
  r.onstart=()=>{setOpen(true);setListening(true);setText('');finalText='';setMessage("I'm listening — take your time, I'll wait for you to pause. Tap the mic again to send sooner.");scheduleFinish();hardStop=setTimeout(finish,45000)}
  r.onresult=(e:any)=>{
   let interim=''
   for(let i=e.resultIndex;i<e.results.length;i++){const res=e.results[i];const t=String(res[0]?.transcript||'');if(res.isFinal)finalText=(finalText+' '+t).trim();else interim+=t}
   setText((finalText+(interim?' '+interim:'')).trim())
   scheduleFinish()
  }
  r.onerror=(e:any)=>{clearTimeout(silenceTimer);clearTimeout(hardStop);setListening(false);const err=e?.error;if(err==='not-allowed'||err==='service-not-allowed')setMessage('Microphone access is blocked for this site. Allow the microphone permission for this site in your browser settings, then try again.');else if(err==='no-speech')setMessage("I didn't catch anything that time. Tap the mic and try again.");else if(err!=='aborted')setMessage('I could not hear that clearly. Try again or type it.')}
  r.onend=()=>{clearTimeout(silenceTimer);clearTimeout(hardStop);setListening(false);oneShotRecognitionRef.current=null;const q=finalText.trim();if(q)interpret(q,'voice')}
  oneShotRecognitionRef.current=r
  try{r.start()}catch{setListening(false);setMessage('Could not start listening. Try again or type it.')}
 }
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
   setOpen(true);setListening(true);setRecording(true);setMessage("I'm listening — take your time. I'll send it once you pause, or tap the mic again to send sooner.")
   watchForSilence(stream,{maxMs:60000,silenceMs:1600,minSpeechMs:300,shouldAbort:()=>mediaRecorderRef.current!==mr||mr.state==='inactive'}).then(()=>{if(mediaRecorderRef.current===mr&&mr.state!=='inactive')stopRecording()})
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
 // Speaks a reply using a realistic server-side voice (OpenAI TTS) when
 // available, falling back to the browser's built-in voice otherwise.
 async function speak(text:string):Promise<void>{
  pauseListening()
  try{
   const r=await fetch('/api/intelligence/speak',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})})
   if(r.ok){
    const blob=await r.blob()
    const url=URL.createObjectURL(blob)
    await new Promise<void>(resolve=>{
     const audio=new Audio(url)
     audio.onended=()=>resolve();audio.onerror=()=>resolve()
     audio.play().catch(()=>resolve())
    })
    URL.revokeObjectURL(url)
    resumeListening()
    return
   }
  }catch{}
  await new Promise<void>(resolve=>{
   if(!('speechSynthesis' in window)){resolve();return}
   try{window.speechSynthesis.cancel()}catch{}
   const u=new SpeechSynthesisUtterance(text)
   u.lang='en-NZ'
   u.onend=()=>resolve();u.onerror=()=>resolve()
   window.speechSynthesis.speak(u)
  })
  resumeListening()
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
   if(d.intent==='query_info'){
    const answer=await answerQuery(String(d.payload?.topic||''),String(d.payload?.scope||'today'))
    setAssistantStatus(answer)
    await speak(answer)
   }else if(EXECUTABLE_INTENTS.includes(d.intent)){
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
   await speak('Yes, go ahead.')
   awaitingCommandRef.current=true
   clearTimeout(awaitingTimeoutRef.current)
   awaitingTimeoutRef.current=setTimeout(()=>{awaitingCommandRef.current=false;if(assistantModeRef.current)setAssistantStatus('Listening for "Hey Ravi"…')},10000)
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
   await watchForSilence(stream,{maxMs:20000,silenceMs:1200,minSpeechMs:250,shouldAbort:()=>!assistantModeRef.current||iosLoopPausedRef.current})
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
  <button type="button" className={`raviVoiceFab${recording?' raviVoiceFabRecording':''}`} aria-label="Ravi voice assistant" onClick={()=>{if(recording){stopRecording();return}if(listening&&oneShotRecognitionRef.current){try{oneShotRecognitionRef.current.stop()}catch{};return}if(assistantMode){setOpen(o=>!o);return}if(open){setOpen(false);return}startVoice()}}>{listening?<MicOff/>:<Mic/>}</button>
  <button type="button" className={`raviAssistantToggle${assistantMode?' raviAssistantToggleOn':''}`} aria-label="Toggle Hey Ravi assistant mode" onClick={()=>assistantMode?stopAssistantMode():startAssistantMode()}><Sparkles/></button>
  {assistantMode&&assistantStatus&&<div className="raviAssistantStatus">{assistantStatus}</div>}
  {open&&<div className="raviVoiceBackdrop" onClick={()=>{if(!recording&&!listening)setOpen(false)}}><section className="raviVoicePanel" onClick={e=>e.stopPropagation()}><header><span><BrainCircuit/><div><small>RAVI INTELLIGENCE</small><b>What should I manage?</b></div></span><button type="button" onClick={()=>{if(recording)stopRecording();if(listening&&oneShotRecognitionRef.current){try{oneShotRecognitionRef.current.stop()}catch{}}setOpen(false)}}><X/></button></header><form onSubmit={submit}><textarea autoFocus value={text} onChange={e=>setText(e.target.value)} placeholder="Try: ‘Remind me Monday morning to call the cricket association’, ‘Spent $45 on groceries’, ‘I am waiting for John’. On a phone, your keyboard's own mic/dictation key works here too."/><button disabled={busy||!text.trim()}><Send/>{busy?'Working…':'Understand'}</button></form>{message&&<p className="raviVoiceMessage">{message}</p>}{result&&result.intent==='query_info'&&!busy&&message&&<button type="button" className="raviVoiceReadAloud" onClick={()=>speak(message)}><Sparkles/>Read aloud</button>}{result&&result.intent!=='query_info'&&<div className="raviVoiceResult"><div className="raviVoiceMeta"><span>{result.domain}</span><span>{Math.round((result.confidence||0)*100)}% confidence</span><span>{result.riskLevel} risk</span></div><h3>{result.summary}</h3>{executed?<p><CheckCircle2/> Completed and recorded.</p>:<p><ShieldCheck/> {result.requiresApproval?'Approval required before action.':'Safe action can be completed automatically.'}</p>}{!executed&&executable&&result.requiresApproval&&<button onClick={()=>execute()}><CheckCircle2/>Approve & execute</button>}{executed&&<button onClick={route}><CheckCircle2/>Open {result.domain==='tasks'?'Reminders / Tasks':result.domain}</button>}{!executable&&<button onClick={route}>Review in {result.domain==='email'?'Personal Secretary':result.domain.charAt(0).toUpperCase()+result.domain.slice(1)}</button>}</div>}<footer>Say "Hey Ravi" (tap the sparkle button once to turn on) for hands-free capture — it waits for a natural pause instead of cutting you off, executes finance, tasks, reminders, family, health and notes automatically, and replies out loud. Email sends, money movement and other consequential actions remain explicitly gated.</footer></section></div>}
 </>
}
