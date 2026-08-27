create extension if not exists pgcrypto;

create table if not exists public.users (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.habits (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  icon text not null default '•',
  color text not null default '#6f7f55',
  goal integer not null default 0,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.users(id) on delete cascade,
  title text not null,
  note text not null default '',
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goal_logs (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.users(id) on delete cascade,
  goal_id text not null references public.goals(id) on delete cascade,
  date date not null,
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, goal_id, date)
);

create table if not exists public.habit_logs (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.users(id) on delete cascade,
  habit_id text not null references public.habits(id) on delete cascade,
  date timestamptz not null,
  completed boolean not null default false,
  value numeric,
  created_at timestamptz not null default now(),
  unique (user_id, habit_id, date)
);

create table if not exists public.timer_logs (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.users(id) on delete cascade,
  category text not null check (category in ('Study', 'Other', 'Food')),
  start_time timestamptz not null,
  end_time timestamptz not null,
  duration integer not null check (duration > 0),
  created_at timestamptz not null default now()
);

create index if not exists habits_user_order_idx on public.habits (user_id, display_order, created_at);
create index if not exists goals_user_created_idx on public.goals (user_id, created_at);
create index if not exists goal_logs_user_date_idx on public.goal_logs (user_id, date);
create index if not exists habit_logs_user_date_idx on public.habit_logs (user_id, date);
create index if not exists timer_logs_user_start_idx on public.timer_logs (user_id, start_time);

alter table public.users enable row level security;
alter table public.goals enable row level security;
alter table public.goal_logs enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.timer_logs enable row level security;
