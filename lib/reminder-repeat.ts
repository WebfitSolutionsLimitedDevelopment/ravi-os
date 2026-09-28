// Repeat options for shared reminders. The edge function stores the value
// in ravi_os_reminders.recurrence_pattern and rolls a repeating reminder on
// to its next date once its day (Auckland time) has passed.
export type Repeat='none'|'daily'|'weekly'|'fortnightly'|'monthly'|'yearly'

export const REPEAT_OPTIONS:{value:Repeat;label:string}[]=[
  {value:'none',label:'Does not repeat'},
  {value:'daily',label:'Every day'},
  {value:'weekly',label:'Every week'},
  {value:'fortnightly',label:'Every 2 weeks'},
  {value:'monthly',label:'Every month'},
  {value:'yearly',label:'Every year'},
]

export function repeatLabel(repeat?:string|null,until?:string|null){
  const opt=REPEAT_OPTIONS.find(o=>o.value===repeat)
  if(!opt||opt.value==='none')return ''
  const base=`Repeats ${opt.label.toLowerCase()}`
  if(!until)return base
  const d=new Date(`${until}T12:00:00`).toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'})
  return `${base} until ${d}`
}

// Google Calendar "recur" parameter so the calendar event repeats too.
export function repeatRRule(repeat?:string|null,until?:string|null){
  const freq:Record<string,string>={daily:'FREQ=DAILY',weekly:'FREQ=WEEKLY',fortnightly:'FREQ=WEEKLY;INTERVAL=2',monthly:'FREQ=MONTHLY',yearly:'FREQ=YEARLY'}
  const rule=repeat?freq[repeat]:undefined
  if(!rule)return ''
  return `RRULE:${rule}${until?`;UNTIL=${until.replace(/-/g,'')}`:''}`
}
