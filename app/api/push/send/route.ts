import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

type SubscriptionRow = { id: string; endpoint: string; p256dh: string; auth: string }

function localParts(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const value = (type: string) => parts.find((part) => part.type === type)?.value || ''
  return { date: `${value('year')}-${value('month')}-${value('day')}`, time: `${value('hour')}:${value('minute')}` }
}

async function sendToUser(admin: ReturnType<typeof createAdminClient>, userId: string, payload: object) {
  const { data } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id', userId)
  for (const row of (data || []) as SubscriptionRow[]) {
    try {
      await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify(payload))
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('id', row.id)
    }
  }
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  webpush.setVapidDetails(
    'mailto:knutesteel@gmail.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  const admin = createAdminClient()
  const now = new Date()
  let sent = 0

  const { data: schedules } = await admin.from('notification_schedules').select('*').eq('enabled', true)
  for (const schedule of schedules || []) {
    const local = localParts(now, schedule.timezone)
    if (String(schedule.local_time).slice(0, 5) === local.time && schedule.last_sent_local_date !== local.date) {
      await sendToUser(admin, schedule.user_id, { title: 'Time to log your intake', body: 'Add what you ate or drank to keep today accurate.', url: '/' })
      await admin.from('notification_schedules').update({ last_sent_local_date: local.date, updated_at: now.toISOString() }).eq('id', schedule.id)
      sent++
    }
  }

  const { data: bacReminders } = await admin.from('bac_reminders').select('id,user_id').eq('status', 'active').lte('next_reminder_at', now.toISOString())
  for (const reminder of bacReminders || []) {
    await sendToUser(admin, reminder.user_id, { title: 'BAC check due', body: 'It has been 30 minutes. Record a new BAC reading now.', url: '/' })
    await admin.from('bac_reminders').update({ last_sent_at: now.toISOString(), status: 'completed' }).eq('id', reminder.id)
    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
