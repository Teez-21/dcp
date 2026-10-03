-- Sitios de interés: envío público sin cuenta; sólo la editora existente puede aprobar.
begin;

create table if not exists public.interest_sites (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  site_type text not null check (char_length(btrim(site_type)) between 1 and 80),
  description text not null check (char_length(btrim(description)) between 1 and 1200),
  address text not null default '' check (char_length(address) <= 300),
  latitude double precision not null check (latitude between 3.0 and 5.5),
  longitude double precision not null check (longitude between -75.0 and -72.5),
  source_note text not null default '' check (char_length(source_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists interest_sites_name_idx on public.interest_sites (name);
create index if not exists interest_sites_created_at_idx on public.interest_sites (created_at desc);

create table if not exists public.interest_site_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  site_type text not null check (char_length(btrim(site_type)) between 1 and 80),
  description text not null check (char_length(btrim(description)) between 1 and 1200),
  address text not null default '' check (char_length(address) <= 300),
  latitude double precision not null check (latitude between 3.0 and 5.5),
  longitude double precision not null check (longitude between -75.0 and -72.5),
  source_note text not null default '' check (char_length(source_note) <= 1000),
  website text not null default '' check (char_length(website) <= 300),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id),
  approved_site_id uuid references public.interest_sites (id),
  check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null and approved_site_id is null)
    or (status = 'approved' and reviewed_at is not null and reviewed_by is not null and approved_site_id is not null)
    or (status = 'rejected' and reviewed_at is not null and reviewed_by is not null and approved_site_id is null)
  )
);
create index if not exists interest_site_submissions_pending_idx
  on public.interest_site_submissions (created_at desc)
  where status = 'pending';

alter table public.interest_sites enable row level security;
revoke all on table public.interest_sites from public, anon, authenticated;
grant select on table public.interest_sites to anon, authenticated;

alter table public.interest_site_submissions enable row level security;
revoke all on table public.interest_site_submissions from public, anon, authenticated;
grant insert (name, site_type, description, address, latitude, longitude, source_note, website)
  on table public.interest_site_submissions to anon, authenticated;
grant select on table public.interest_site_submissions to authenticated;

create or replace function public.approve_interest_site_submission(p_submission_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  submission_record public.interest_site_submissions%rowtype;
  approved_id uuid;
begin
  if not coalesce((select public.is_character_editor()), false) then
    raise exception 'Not authorized to approve interest sites' using errcode = '42501';
  end if;

  select submission.* into submission_record
  from public.interest_site_submissions as submission
  where submission.id = p_submission_id
    and submission.status = 'pending'
  for update of submission;

  if not found then
    raise exception 'Interest-site proposal not found or already reviewed' using errcode = 'P0002';
  end if;

  insert into public.interest_sites (
    name, site_type, description, address, latitude, longitude, source_note, updated_at
  ) values (
    submission_record.name,
    submission_record.site_type,
    submission_record.description,
    submission_record.address,
    submission_record.latitude,
    submission_record.longitude,
    submission_record.source_note,
    now()
  ) returning id into approved_id;

  update public.interest_site_submissions
  set status = 'approved',
      reviewed_at = now(),
      reviewed_by = (select auth.uid()),
      approved_site_id = approved_id
  where id = submission_record.id;

  return approved_id;
end;
$$;
revoke all on function public.approve_interest_site_submission(uuid) from public, anon, authenticated;
grant execute on function public.approve_interest_site_submission(uuid) to authenticated;

create or replace function public.reject_interest_site_submission(p_submission_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  rejected_id uuid;
begin
  if not coalesce((select public.is_character_editor()), false) then
    raise exception 'Not authorized to review interest sites' using errcode = '42501';
  end if;

  update public.interest_site_submissions
  set status = 'rejected',
      reviewed_at = now(),
      reviewed_by = (select auth.uid())
  where id = p_submission_id
    and status = 'pending'
  returning id into rejected_id;

  if rejected_id is null then
    raise exception 'Interest-site proposal not found or already reviewed' using errcode = 'P0002';
  end if;
  return true;
end;
$$;
revoke all on function public.reject_interest_site_submission(uuid) from public, anon, authenticated;
grant execute on function public.reject_interest_site_submission(uuid) to authenticated;

drop policy if exists "Approved interest sites are publicly readable" on public.interest_sites;
create policy "Approved interest sites are publicly readable"
on public.interest_sites for select
to anon, authenticated
using (true);

drop policy if exists "Visitors can submit pending interest sites" on public.interest_site_submissions;
create policy "Visitors can submit pending interest sites"
on public.interest_site_submissions for insert
to anon, authenticated
with check (
  status = 'pending'
  and reviewed_at is null
  and reviewed_by is null
  and approved_site_id is null
  and website = ''
);

drop policy if exists "Only the editor can read interest-site proposals" on public.interest_site_submissions;
create policy "Only the editor can read interest-site proposals"
on public.interest_site_submissions for select
to authenticated
using ((select public.is_character_editor()));

comment on table public.interest_sites is
  'Puntos de interés aprobados: lectura pública, sin escritura directa desde el cliente.';
comment on table public.interest_site_submissions is
  'Propuestas privadas de Sitios de interés; sólo la cuenta editorial única puede revisarlas.';

commit;
