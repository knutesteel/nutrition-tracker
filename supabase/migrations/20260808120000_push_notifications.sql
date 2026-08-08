create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_time time not null,
  timezone text not null,
  enabled boolean not null default true,
  last_sent_local_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, local_time)
);

create index push_subscriptions_user_idx on public.push_subscriptions(user_id);
create index notification_schedules_user_idx on public.notification_schedules(user_id, enabled);

alter table public.push_subscriptions enable row level security;
alter table public.notification_schedules enable row level security;

create policy push_subscriptions_own_rows on public.push_subscriptions
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy notification_schedules_own_rows on public.notification_schedules
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.push_subscriptions, public.notification_schedules to authenticated;

create or replace function public.claim_due_push_jobs(provided_secret text)
returns table(subscription_id uuid, endpoint text, p256dh text, auth text, title text, body text, url text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if provided_secret is null or provided_secret is distinct from
    (select decrypted_secret from vault.decrypted_secrets where name = 'notification_cron_secret' limit 1)
  then
    raise exception 'unauthorized';
  end if;

  return query
  with due_schedules as (
    select n.id
    from public.notification_schedules n
    where n.enabled
      and (now() at time zone n.timezone)::time >= n.local_time
      and (now() at time zone n.timezone)::time < n.local_time + interval '2 minutes'
      and n.last_sent_local_date is distinct from (now() at time zone n.timezone)::date
    for update skip locked
  ),
  updated_schedules as (
    update public.notification_schedules n
    set last_sent_local_date = (now() at time zone n.timezone)::date, updated_at = now()
    from due_schedules d where n.id = d.id
    returning n.user_id
  ),
  due_bac as (
    select b.id from public.bac_reminders b
    where b.status = 'active' and b.next_reminder_at <= now()
    for update skip locked
  ),
  updated_bac as (
    update public.bac_reminders b set status = 'completed', last_sent_at = now()
    from due_bac d where b.id = d.id
    returning b.user_id
  ),
  jobs as (
    select u.user_id, 'Time to log your intake'::text as title,
      'Add what you ate or drank to keep today accurate.'::text as body, '/'::text as url
    from updated_schedules u
    union all
    select u.user_id, 'BAC check due'::text,
      'It has been 30 minutes. Record a new BAC reading now.'::text, '/'::text
    from updated_bac u
  )
  select p.id, p.endpoint, p.p256dh, p.auth, j.title, j.body, j.url
  from jobs j join public.push_subscriptions p on p.user_id = j.user_id;
end;
$$;

revoke all on function public.claim_due_push_jobs(text) from public;
grant execute on function public.claim_due_push_jobs(text) to anon;
