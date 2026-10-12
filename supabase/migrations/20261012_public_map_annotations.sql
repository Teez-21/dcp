-- Publicación compartida de puntos marcados y comentarios del mapa.
begin;

-- Los puntos que el visitante marca en el mapa se publican directamente.
grant insert (name, site_type, description, address, latitude, longitude, source_note)
  on table public.interest_sites to anon, authenticated;

drop policy if exists "Visitors can publish map points" on public.interest_sites;
create policy "Visitors can publish map points"
  on public.interest_sites for insert to anon, authenticated
  with check (
    char_length(btrim(name)) between 1 and 120
    and char_length(btrim(site_type)) between 1 and 80
    and char_length(btrim(description)) between 1 and 1200
    and char_length(address) <= 300
    and char_length(source_note) <= 1000
    and latitude between 3.0 and 5.5
    and longitude between -75.0 and -72.5
  );

create table if not exists public.map_observations (
  id uuid primary key default gen_random_uuid(),
  observation text not null check (char_length(btrim(observation)) between 1 and 1200),
  website text not null default '' check (char_length(website) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists map_observations_created_at_idx
  on public.map_observations (created_at desc);

alter table public.map_observations enable row level security;
revoke all on table public.map_observations from public, anon, authenticated;
grant select, insert on table public.map_observations to anon, authenticated;

drop policy if exists "Public can read map observations" on public.map_observations;
create policy "Public can read map observations"
  on public.map_observations for select to anon, authenticated
  using (true);

drop policy if exists "Visitors can add map observations" on public.map_observations;
create policy "Visitors can add map observations"
  on public.map_observations for insert to anon, authenticated
  with check (
    website = ''
    and char_length(btrim(observation)) between 1 and 1200
  );

comment on table public.map_observations is 'Comentarios públicos de sólo adición sobre el mapa electoral.';

commit;
