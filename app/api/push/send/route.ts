import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

type PushJob = { subscription_id: string; endpoint: string; p256dh: string; auth: string; title: string; body: string; url: string }

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
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } })
  const { data, error } = await supabase.rpc('claim_due_push_jobs', { provided_secret: process.env.CRON_SECRET })
  if (error) return NextResponse.json({ error: 'Unable to claim notification jobs' }, { status: 500 })
  let sent = 0
  for (const job of (data || []) as PushJob[]) {
    try {
      await webpush.sendNotification({ endpoint: job.endpoint, keys: { p256dh: job.p256dh, auth: job.auth } }, JSON.stringify({ title: job.title, body: job.body, url: job.url }))
      sent++
    } catch (pushError) {
      console.error('Push delivery failed', job.subscription_id, (pushError as Error).message)
    }
  }

  return NextResponse.json({ ok: true, sent })
}
