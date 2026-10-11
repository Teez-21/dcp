-- Observaciones públicas asociadas a cada encuesta de percepción ciudadana.
begin;

create table if not exists public.citizen_survey_observations (
  id uuid primary key default gen_random_uuid(),
  survey_id text not null check (char_length(btrim(survey_id)) between 1 and 120),
  observation text not null check (char_length(btrim(observation)) between 1 and 1200),
  website text not null default '' check (char_length(website) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists citizen_survey_observations_survey_idx
  on public.citizen_survey_observations (survey_id, created_at desc);

alter table public.citizen_survey_observations enable row level security;
revoke all on table public.citizen_survey_observations from public, anon, authenticated;
grant select, insert on table public.citizen_survey_observations to anon, authenticated;

drop policy if exists "Public can read citizen survey observations" on public.citizen_survey_observations;
create policy "Public can read citizen survey observations"
  on public.citizen_survey_observations for select to anon, authenticated
  using (true);

drop policy if exists "Visitors can add citizen survey observations" on public.citizen_survey_observations;
create policy "Visitors can add citizen survey observations"
  on public.citizen_survey_observations for insert to anon, authenticated
  with check (
    website = ''
    and char_length(btrim(survey_id)) between 1 and 120
    and char_length(btrim(observation)) between 1 and 1200
  );

comment on table public.citizen_survey_observations is 'Observaciones públicas de sólo adición asociadas a encuestas ciudadanas.';

commit;
