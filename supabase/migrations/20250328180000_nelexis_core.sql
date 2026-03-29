-- Nelexis core schema: stations, plants, events, photos, telemetry, crop templates, AI suggestions, firmware reports

create extension if not exists "pgcrypto";

-- --- Crop templates (Phase 3 seed data; reference for calendar) ---
create table if not exists public.crop_templates (
  id uuid primary key default gen_random_uuid(),
  species text not null,
  variety text,
  growth_stage_labels text[] not null default array['seedling','vegetative','flowering','fruiting','harvest'],
  typical_cycle_days_min int not null default 45,
  typical_cycle_days_max int not null default 90,
  target_ph_min numeric(4,2),
  target_ph_max numeric(4,2),
  target_ec_min numeric(5,2),
  target_ec_max numeric(5,2),
  notes text,
  created_at timestamptz not null default now()
);

-- --- Stations (linked to Arduino Cloud Thing id string) ---
create table if not exists public.stations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  arduino_thing_id text,
  location_note text,
  created_at timestamptz not null default now()
);

create index if not exists stations_user_id_idx on public.stations (user_id);

-- --- Plants ---
create type public.growth_stage as enum (
  'seedling',
  'vegetative',
  'flowering',
  'fruiting',
  'harvest',
  'completed'
);

create type public.market_channel as enum ('retail', 'csa', 'processing', 'other');

create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  station_id uuid references public.stations (id) on delete set null,
  crop_template_id uuid references public.crop_templates (id) on delete set null,
  nickname text not null,
  species text,
  variety text,
  stage public.growth_stage not null default 'seedling',
  started_at date not null default (now() at time zone 'utc')::date,
  target_market_date date,
  expected_harvest_start date,
  expected_harvest_end date,
  batch_id text,
  market_channel public.market_channel default 'retail',
  market_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plants_user_id_idx on public.plants (user_id);
create index if not exists plants_station_id_idx on public.plants (station_id);

-- --- Timeline events ---
create table if not exists public.plant_events (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null,
  body text,
  created_at timestamptz not null default now()
);

create index if not exists plant_events_plant_id_idx on public.plant_events (plant_id);

-- --- Daily photos ---
create table if not exists public.daily_photos (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  caption text,
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists daily_photos_plant_id_idx on public.daily_photos (plant_id);

-- --- Sensor snapshots (Arduino / webhook) ---
create table if not exists public.sensor_snapshots (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations (id) on delete cascade,
  ph numeric(5,3),
  ec numeric(6,3),
  temp_air_c numeric(5,2),
  humidity_pct numeric(5,2),
  light_lux numeric(12,2),
  water_level_norm numeric(5,4),
  pump_running boolean,
  irrigation_state int,
  raw jsonb,
  recorded_at timestamptz not null default now()
);

create index if not exists sensor_snapshots_station_idx on public.sensor_snapshots (station_id);
create index if not exists sensor_snapshots_recorded_idx on public.sensor_snapshots (recorded_at desc);

-- --- AI health suggestions (human confirmation required in app) ---
create table if not exists public.plant_health_suggestions (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  daily_photo_id uuid references public.daily_photos (id) on delete set null,
  risk_score numeric(4,2),
  summary text,
  suggested_checks text[],
  model text,
  raw_response jsonb,
  confirmed_ok boolean,
  operator_note text,
  created_at timestamptz not null default now()
);

create index if not exists plant_health_suggestions_plant_idx on public.plant_health_suggestions (plant_id);

-- --- Firmware reports (Phase 4) ---
create table if not exists public.firmware_reports (
  id uuid primary key default gen_random_uuid(),
  station_id uuid references public.stations (id) on delete set null,
  arduino_thing_id text,
  firmware_version text not null,
  reported_at timestamptz not null default now(),
  meta jsonb
);

create index if not exists firmware_reports_station_idx on public.firmware_reports (station_id);

-- --- updated_at trigger ---
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists plants_updated_at on public.plants;
create trigger plants_updated_at
  before update on public.plants
  for each row execute procedure public.set_updated_at();

-- --- RLS ---
alter table public.stations enable row level security;
alter table public.plants enable row level security;
alter table public.plant_events enable row level security;
alter table public.daily_photos enable row level security;
alter table public.sensor_snapshots enable row level security;
alter table public.plant_health_suggestions enable row level security;
alter table public.firmware_reports enable row level security;
alter table public.crop_templates enable row level security;

-- Crop templates: readable by any authenticated user
create policy crop_templates_select on public.crop_templates
  for select to authenticated using (true);

-- Stations
create policy stations_all on public.stations
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Plants
create policy plants_all on public.plants
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Plant events
create policy plant_events_all on public.plant_events
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Daily photos
create policy daily_photos_all on public.daily_photos
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Sensor snapshots: allow read/write if station belongs to user
create policy sensor_snapshots_select on public.sensor_snapshots
  for select to authenticated
  using (
    exists (select 1 from public.stations s where s.id = station_id and s.user_id = auth.uid())
  );

create policy sensor_snapshots_insert on public.sensor_snapshots
  for insert to authenticated
  with check (
    exists (select 1 from public.stations s where s.id = station_id and s.user_id = auth.uid())
  );

-- Service role / edge functions often use service key — allow insert from service via bypass RLS; webhook uses service role in API route

-- Health suggestions
create policy plant_health_all on public.plant_health_suggestions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Firmware reports: owners can read their stations' reports; insert via service from API
create policy firmware_reports_select on public.firmware_reports
  for select to authenticated
  using (
    station_id is null
    or exists (select 1 from public.stations s where s.id = station_id and s.user_id = auth.uid())
  );

-- --- Helper: suggested start date for market target ---
create or replace function public.suggested_start_date(
  p_target_market date,
  p_template_id uuid,
  p_buffer_days int default 7
)
returns date
language plpgsql
stable
as $$
declare
  cycle_max int := 60;
begin
  if p_target_market is null then
    return null;
  end if;
  if p_template_id is not null then
    select ct.typical_cycle_days_max into cycle_max
    from public.crop_templates ct
    where ct.id = p_template_id;
  end if;
  return p_target_market - coalesce(p_buffer_days, 7) - coalesce(cycle_max, 60);
end;
$$;

grant execute on function public.suggested_start_date(date, uuid, int) to authenticated;

-- --- Seed crop templates (example) ---
insert into public.crop_templates (species, variety, typical_cycle_days_min, typical_cycle_days_max, target_ph_min, target_ph_max, target_ec_min, target_ec_max, notes)
select v.*
from (
  values
    ('Lettuce'::text, 'Butterhead'::text, 35, 55, 5.5::numeric, 6.5::numeric, 1.0::numeric, 1.8::numeric, 'Leafy greens — lower EC'::text),
    ('Tomato', 'Cherry', 75, 110, 5.8, 6.3, 2.0, 3.5, 'Fruiting crop — higher EC in fruiting'),
    ('Basil', 'Genovese', 40, 60, 5.5, 6.5, 1.0, 2.0, 'Herbs')
) as v(species, variety, typical_cycle_days_min, typical_cycle_days_max, target_ph_min, target_ph_max, target_ec_min, target_ec_max, notes)
where not exists (
  select 1 from public.crop_templates c
  where c.species = v.species and coalesce(c.variety, '') = coalesce(v.variety, '')
);

-- Note: crop_templates insert has no policy for authenticated — use dashboard/service role to add more
