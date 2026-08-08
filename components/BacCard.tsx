'use client'
import {useEffect,useState} from 'react'
import {useRouter} from 'next/navigation'
import {getBacWarning} from '@/lib/bac'

type Reminder={id:string;related_entry_id:string;next_reminder_at:string;status:string}

export default function BacCard({reminders}:{reminders:Reminder[]}) {
  const router=useRouter()
  const [bac,setBac]=useState('')
  const [busy,setBusy]=useState(false)
  const [msg,setMsg]=useState('')
  const due=reminders.find(x=>new Date(x.next_reminder_at)<=new Date())
  const warning=getBacWarning(bac===''?null:Number(bac))
  useEffect(()=>{if(due&&'Notification'in window&&Notification.permission==='granted')new Notification('Time to record your BAC',{body:'Your 30-minute alcohol reminder is due.'})},[due])
  async function save(){setBusy(true);setMsg('');const res=await fetch('/api/bac',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({bac:Number(bac),related_entry_id:due?.related_entry_id})});const j=await res.json();setBusy(false);if(!res.ok)return setMsg(j.error||'Unable to save');setBac('');setMsg('BAC recorded.');router.refresh()}
  async function notify(){if('Notification'in window){const permission=await Notification.requestPermission();setMsg(permission==='granted'?'Notifications enabled while the app is open.':'Notifications were not enabled.')}}
  return <div className={`card ${due?'due':''}`}>
    <h3 className="section-title">BAC Check</h3>
    {due?<p className="warn">A 30-minute alcohol reminder is due.</p>:<p className="tiny">{reminders.length?`Next check ${new Date(reminders[0].next_reminder_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}`:'No active alcohol reminders.'}</p>}
    <div className="inline-form"><input aria-label="BAC reading" className="input" inputMode="decimal" placeholder="0.000" value={bac} onChange={e=>setBac(e.target.value)}/><button className="btn" disabled={busy||bac===''||Number(bac)<0||Number(bac)>1} onClick={save}>{busy?'Saving…':'Record BAC'}</button></div>
    {warning&&<div className={`bac-alert ${warning.level}`} role="alert"><b>{warning.title}</b><span>{warning.message}</span></div>}
    <button className="text-btn" onClick={notify}>Enable reminder notifications</button>
    {msg&&<p className="tiny">{msg}</p>}
    <p className="micro">BAC readings are for tracking only. Never use a reading or a legal limit to decide whether it is safe to drive.</p>
  </div>
}
