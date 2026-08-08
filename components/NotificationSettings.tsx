'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Schedule = { id: string; local_time: string; enabled: boolean }

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}

export default function NotificationSettings() {
  const supabase = createClient()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [message, setMessage] = useState('')

  const load = async () => {
    const { data } = await supabase.from('notification_schedules').select('id,local_time,enabled').order('local_time')
    setSchedules((data || []) as Schedule[])
  }
  useEffect(() => {
    setPermission('Notification' in window && 'serviceWorker' in navigator ? Notification.permission : 'unsupported')
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const enable = async () => {
    setMessage('')
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return setMessage('Push notifications are not supported on this device.')
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result !== 'granted') return setMessage('Notification permission was not granted.')
    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) })
    }
    const response = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subscription: subscription.toJSON(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }) })
    if (!response.ok) return setMessage((await response.json()).error || 'Could not enable notifications.')
    setMessage('Notifications are enabled on this device.')
    load()
  }

  const save = async (schedule: Schedule, changes: Partial<Schedule>) => {
    await supabase.from('notification_schedules').update({ ...changes, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, updated_at: new Date().toISOString() }).eq('id', schedule.id)
    load()
  }
  const add = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notification_schedules').insert({ user_id: user.id, local_time: '09:00:00', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
    load()
  }
  const remove = async (id: string) => { await supabase.from('notification_schedules').delete().eq('id', id); load() }

  return <div className="card"><div className="row"><div><h3 className="section-title">Intake Notifications</h3><p className="tiny">Daily reminders use this device’s local time.</p></div><button className="button" onClick={enable}>{permission === 'granted' ? 'Reconnect' : 'Enable'}</button></div>{message&&<p className="tiny">{message}</p>}{permission==='unsupported'&&<p className="tiny">On iPhone, install this app to the Home Screen first, then reopen Settings.</p>}<div className="notification-list">{schedules.map((schedule)=><div className="notification-row" key={schedule.id}><input aria-label="Reminder time" type="time" value={schedule.local_time.slice(0,5)} onChange={(event)=>save(schedule,{local_time:`${event.target.value}:00`})}/><label className="tiny"><input type="checkbox" checked={schedule.enabled} onChange={(event)=>save(schedule,{enabled:event.target.checked})}/> Enabled</label><button className="button secondary" onClick={()=>remove(schedule.id)}>Delete</button></div>)}<button className="button secondary" onClick={add}>Add Notification</button></div></div>
}
