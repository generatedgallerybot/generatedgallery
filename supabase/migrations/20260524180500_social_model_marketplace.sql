-- Social + model asset marketplace primitives.
-- Server routes use service_role. Public client access stays closed by RLS.

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('image', 'gallery', 'lora', 'model_asset', 'output')),
  target_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text null,
  body text not null check (char_length(body) between 2 and 1000),
  status text not null default 'visible' check (status in ('visible', 'hidden', 'deleted', 'flagged')),
  moderation_note text null,
  parent_id uuid null references public.comments(id) on delete cascade,
  upvotes integer not null default 0,
  reports_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comments_target_created_idx on public.comments (target_type, target_id, created_at desc);
create index if not exists comments_user_created_idx on public.comments (user_id, created_at desc);
create index if not exists comments_status_created_idx on public.comments (status, created_at desc);

create table if not exists public.model_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text null,
  name text not null check (char_length(name) between 1 and 160),
  description text null,
  asset_type text not null default 'other' check (asset_type in ('lora', 'checkpoint', 'textual_inversion', 'vae', 'workflow', 'dataset', 'other')),
  base_model text not null default 'other' check (base_model in ('flux', 'sdxl', 'sd15', 'pony', 'wan', 'hunyuan', 'other')),
  file_url text not null,
  source_url text null,
  preview_url text null,
  license text null,
  trigger_words text[] not null default '{}',
  tags text[] not null default '{}',
  version text null,
  recommended_strength numeric null,
  is_nsfw boolean not null default false,
  status text not null default 'published' check (status in ('draft', 'published', 'hidden', 'deleted', 'flagged')),
  downloads integer not null default 0,
  uses integer not null default 0,
  likes integer not null default 0,
  comments_count integer not null default 0,
  reports_count integer not null default 0,
  moderation_note text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists model_assets_status_created_idx on public.model_assets (status, created_at desc);
create index if not exists model_assets_type_created_idx on public.model_assets (asset_type, created_at desc);
create index if not exists model_assets_base_created_idx on public.model_assets (base_model, created_at desc);
create index if not exists model_assets_user_created_idx on public.model_assets (user_id, created_at desc);
create index if not exists model_assets_tags_gin_idx on public.model_assets using gin (tags);
create index if not exists model_assets_triggers_gin_idx on public.model_assets using gin (trigger_words);

create table if not exists public.model_asset_reactions (
  asset_id uuid not null references public.model_assets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null default 'like' check (reaction in ('like', 'save')),
  created_at timestamptz not null default now(),
  primary key (asset_id, user_id, reaction)
);

create index if not exists model_asset_reactions_user_idx on public.model_asset_reactions (user_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists comments_touch_updated_at on public.comments;
create trigger comments_touch_updated_at before update on public.comments
for each row execute function public.touch_updated_at();

drop trigger if exists model_assets_touch_updated_at on public.model_assets;
create trigger model_assets_touch_updated_at before update on public.model_assets
for each row execute function public.touch_updated_at();

alter table public.comments enable row level security;
alter table public.model_assets enable row level security;
alter table public.model_asset_reactions enable row level security;

drop policy if exists "service role can manage comments" on public.comments;
create policy "service role can manage comments" on public.comments
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service role can manage model assets" on public.model_assets;
create policy "service role can manage model assets" on public.model_assets
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service role can manage model asset reactions" on public.model_asset_reactions;
create policy "service role can manage model asset reactions" on public.model_asset_reactions
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
