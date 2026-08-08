import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_TIMES = ['12:05:00', '18:03:00', '23:15:00']

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const subscription = body.subscription
  const timezone = String(body.timezone || 'America/New_York')
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: 'Invalid push subscription' }, { status: 400 })
  }

  const { error: subscriptionError } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    user_agent: request.headers.get('user-agent'),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' })
  if (subscriptionError) return NextResponse.json({ error: subscriptionError.message }, { status: 500 })

  const { data: existing } = await supabase.from('notification_schedules').select('id').limit(1)
  if (!existing?.length) {
    const { error } = await supabase.from('notification_schedules').insert(
      DEFAULT_TIMES.map((local_time) => ({ user_id: user.id, local_time, timezone }))
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { endpoint } = await request.json()
  const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
