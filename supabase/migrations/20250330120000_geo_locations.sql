-- Optional lat/lng for Lexis globe pins and farm plots

alter table public.stations
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_label text;

alter table public.plants
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

comment on column public.stations.latitude is 'WGS84; optional map/globe pin';
comment on column public.plants.latitude is 'Override station position for plant-level pin when set';
