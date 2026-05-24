create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9][a-z0-9_-]{2,31}$'),
  display_name text null check (display_name is null or char_length(display_name) between 1 and 80),
  bio text null check (bio is null or char_length(bio) <= 500),
  avatar_url text null,
  website_url text null,
  is_private boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles (username);
create index if not exists profiles_public_created_idx on public.profiles (created_at desc) where is_private = false;

alter table public.profiles enable row level security;

drop policy if exists "service role can manage profiles" on public.profiles;
create policy "service role can manage profiles" on public.profiles
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
