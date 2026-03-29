-- AI care calendar, streaks, push tokens, station automation policy

-- --- Enums ---
DO $$ BEGIN
  CREATE TYPE public.light_exposure AS ENUM ('full_sun', 'partial', 'low', 'corner_dark');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.care_task_type AS ENUM (
    'tank_refill',
    'photo_checkup',
    'sunlight_reminder',
    'nutrient_adjust',
    'sensor_anomaly',
    'custom'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.care_task_source AS ENUM ('rule', 'openai');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- --- Plants: light + AI context ---
alter table public.plants
  add column if not exists light_exposure public.light_exposure default 'partial'::public.light_exposure,
  add column if not exists substrate_type text,
  add column if not exists nutrient_regimen_note text;

update public.plants set light_exposure = coalesce(light_exposure, 'partial'::public.light_exposure);

alter table public.plants alter column light_exposure set default 'partial'::public.light_exposure;
alter table public.plants alter column light_exposure set not null;

-- --- Stations: alert threshold for reservoir (normalized 0..1) ---
alter table public.stations
  add column if not exists water_level_alert_below numeric(5,4) default 0.35;

-- --- Care tasks ---
create table if not exists public.care_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plant_id uuid references public.plants (id) on delete set null,
  station_id uuid references public.stations (id) on delete set null,
  task_type public.care_task_type not null default 'custom',
  title text not null,
  body text,
  due_at timestamptz not null,
  source public.care_task_source not null default 'rule',
  payload_json jsonb,
  completed_at timestamptz,
  dismissed_at timestamptz,
  arduino_cloud_sync_status text,
  created_at timestamptz not null default now()
);

create index if not exists care_tasks_user_due_idx on public.care_tasks (user_id, due_at);
create index if not exists care_tasks_plant_idx on public.care_tasks (plant_id);
create index if not exists care_tasks_open_idx on public.care_tasks (user_id)
  where completed_at is null and dismissed_at is null;

-- --- Streaks (per plant per user) ---
create table if not exists public.care_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plant_id uuid not null references public.plants (id) on delete cascade,
  current_count int not null default 0,
  best_count int not null default 0,
  last_activity_date date,
  updated_at timestamptz not null default now(),
  unique (user_id, plant_id)
);

create index if not exists care_streaks_user_idx on public.care_streaks (user_id);

-- --- Expo push tokens ---
create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expo_push_token text not null,
  platform text,
  updated_at timestamptz not null default now(),
  unique (expo_push_token)
);

create index if not exists user_push_tokens_user_idx on public.user_push_tokens (user_id);

-- --- Opt-in Arduino Cloud writes per station ---
create table if not exists public.station_automation_policy (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  station_id uuid not null references public.stations (id) on delete cascade,
  allow_ai_cloud_writes boolean not null default false,
  arduino_cloud_device_id text,
  allowed_properties jsonb not null default '[]'::jsonb,
  max_pump_seconds int not null default 120,
  min_interval_seconds int not null default 600,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (station_id)
);

create index if not exists station_automation_policy_user_idx on public.station_automation_policy (user_id);

drop trigger if exists station_automation_policy_updated_at on public.station_automation_policy;
create trigger station_automation_policy_updated_at
  before update on public.station_automation_policy
  for each row execute procedure public.set_updated_at();

-- --- RLS ---
alter table public.care_tasks enable row level security;
alter table public.care_streaks enable row level security;
alter table public.user_push_tokens enable row level security;
alter table public.station_automation_policy enable row level security;

create policy care_tasks_all on public.care_tasks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy care_streaks_all on public.care_streaks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy user_push_tokens_all on public.user_push_tokens
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy station_automation_policy_all on public.station_automation_policy
  for all to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.stations s
      where s.id = station_id and s.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.stations s
      where s.id = station_id and s.user_id = auth.uid()
    )
  );
