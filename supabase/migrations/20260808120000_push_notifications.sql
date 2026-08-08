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
