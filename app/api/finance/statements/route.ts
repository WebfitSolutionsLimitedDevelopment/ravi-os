import { NextResponse } from 'next/server'
import { reminderActor, isFinanceSession } from '../../../../lib/server/ravi-os-auth'
import { financeAction } from '../../../../lib/server/finance-client'
import { familyAction } from '../../../../lib/server/family-reminder-client'
import { clearReminderListCache } from '../../../../lib/server/reminder-list-cache'

function unauthorized(){return NextResponse.json({error:'Unauthorized'},{status:401})}
function financeLocked(){return NextResponse.json({error:'Finance PIN required'},{status:401})}
async function relay(response:Response|null){if(!response)return NextResponse.json({error:'Finance session required'},{status:428});const text=await response.text();return new NextResponse(text,{status:response.status,headers:{'Content-Type':response.headers.get('content-type')||'application/json','Cache-Control':'no-store'}})}

function money(n:number,c:string){try{return new Intl.NumberFormat('en-NZ',{style:'currency',currency:c,maximumFractionDigits:2}).format(n)}catch{return `${n.toFixed(2)} ${c}`}}

// A statement with a payment due date is a bill — it belongs on the same
// home-dashboard reminders list as everything else Ravi has to act on, not
// buried in a Finance tab he has to remember to check. This mirrors the
// figures the Finance section itself surfaces: minimum due, the ordinary
// (non-promotional) balance to pay in full to dodge interest, and the
// Smart-Rate-style 0% balance kept visibly separate.
async function createDueReminder(statement:any){
  if(!statement?.paymentDueDate)return null
  const label=statement.accountLabel||statement.institution||'Card'
  const title=`Pay ${label}`.slice(0,140)
  const parts:string[]=[]
  if(statement.minimumDue!=null)parts.push(`Minimum due ${money(statement.minimumDue,statement.currency)}.`)
  if(statement.closingBalance!=null)parts.push(`Closing balance ${money(statement.closingBalance,statement.currency)}.`)
  if(statement.ordinaryBalance!=null)parts.push(`Ordinary balance (pay this to avoid interest) ${money(statement.ordinaryBalance,statement.currency)}.`)
  const promoTotal=(statement.promoBalances||[]).reduce((a:number,p:any)=>a+Number(p.amountOwing||0),0)
  if(promoTotal>0){const expiry=statement.promoBalances.find((p:any)=>p.rateApplicableUntil)?.rateApplicableUntil;parts.push(`0%/Smart Rate balance ${money(promoTotal,statement.currency)} stays interest-free${expiry?` until ${expiry}`:''} — kept separate from the ordinary balance above.`)}
  if(statement.recommendedPayment!=null)parts.push(`Recommended payment: ${money(statement.recommendedPayment,statement.currency)}.`)
  const response=await familyAction('create',{title,date:statement.paymentDueDate,time:'09:00',notes:parts.join(' '),source:'text',legacyClientId:`finance-stmt-${statement.id}`})
  if(!response?.ok)return null
  const data=await response.json().catch(()=>null)
  const reminderId=data?.id?String(data.id):null
  if(reminderId)clearReminderListCache()
  return reminderId
}

export async function GET(){
  if(await reminderActor()!=='ravi')return unauthorized()
  if(!await isFinanceSession())return financeLocked()
  return relay(await financeAction('statement_list'))
}

export async function POST(request:Request){
  if(await reminderActor()!=='ravi')return unauthorized()
  if(!await isFinanceSession())return financeLocked()
  const body=await request.json().catch(()=>({}))
  const response=await financeAction('statement_create',body)
  if(!response)return NextResponse.json({error:'Finance session required'},{status:428})
  if(!response.ok)return relay(response)
  const data=await response.json().catch(()=>null)
  // A duplicate is the same statement we already have on file — surface it
  // as-is (so the UI can say "already saved") without creating a second
  // dashboard reminder for a bill Ravi has already been told about.
  if(data?.duplicate)return NextResponse.json(data,{status:200})
  const statement=data?.statement
  if(statement){
    try{
      const reminderId=await createDueReminder(statement)
      if(reminderId){
        const linked=await financeAction('statement_set_reminder',{id:statement.id,reminderId})
        if(linked?.ok){const linkedData=await linked.json().catch(()=>null);if(linkedData?.statement)return NextResponse.json({...data,statement:linkedData.statement},{status:201})}
      }
    }catch{}
  }
  return NextResponse.json(data,{status:201})
}
