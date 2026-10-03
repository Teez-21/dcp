-- Ejecutar desde Supabase Dashboard > SQL Editor.
-- Visitantes anónimos sólo pueden proponer; las propuestas no son públicas hasta ser aprobadas.
-- La cuenta editorial única se crea manualmente; nunca usar service_role en el navegador.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.character_editors (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on table private.character_editors from public, anon, authenticated;
alter table private.character_editors enable row level security;
drop policy if exists "Editors can read their own membership" on private.character_editors;
create policy "Editors can read their own membership"
on private.character_editors for select
to authenticated
using (user_id = (select auth.uid()));

-- Un único slot booleano, siempre TRUE, permite como máximo una cuenta aprobadora.
alter table private.character_editors
  add column if not exists singleton boolean not null default true;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'character_editors_singleton_check'
      and conrelid = 'private.character_editors'::regclass
  ) then
    alter table private.character_editors
      add constraint character_editors_singleton_check check (singleton is true);
  end if;
end;
$$;
create unique index if not exists character_editors_singleton_idx
  on private.character_editors (singleton);

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  character_type text not null check (char_length(btrim(character_type)) between 1 and 80),
  image_path text check (image_path is null or char_length(image_path) <= 500),
  contact text check (contact is null or char_length(contact) <= 300),
  facebook_url text check (facebook_url is null or (char_length(facebook_url) <= 300 and facebook_url ~* '^https://')),
  instagram_url text check (instagram_url is null or (char_length(instagram_url) <= 300 and instagram_url ~* '^https://')),
  x_url text check (x_url is null or (char_length(x_url) <= 300 and x_url ~* '^https://')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists characters_name_idx on public.characters (name);

create table if not exists public.character_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  character_type text not null check (char_length(btrim(character_type)) between 1 and 80),
  contact text not null default '' check (char_length(contact) <= 300),
  facebook_url text not null default '' check (char_length(facebook_url) <= 300 and (facebook_url = '' or facebook_url ~* '^https://')),
  instagram_url text not null default '' check (char_length(instagram_url) <= 300 and (instagram_url = '' or instagram_url ~* '^https://')),
  x_url text not null default '' check (char_length(x_url) <= 300 and (x_url = '' or x_url ~* '^https://')),
  source_note text not null default '' check (char_length(source_note) <= 1000),
  website text not null default '' check (char_length(website) <= 300),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id),
  approved_character_id uuid references public.characters (id) on delete set null,
  check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null and approved_character_id is null)
    or (status = 'approved' and reviewed_at is not null and reviewed_by is not null and approved_character_id is not null)
    or (status = 'rejected' and reviewed_at is not null and reviewed_by is not null and approved_character_id is null)
  )
);
create index if not exists character_submissions_pending_idx
  on public.character_submissions (created_at desc)
  where status = 'pending';

alter table public.characters enable row level security;
revoke all on table public.characters from public, anon, authenticated;
grant select on table public.characters to anon, authenticated;
grant insert, update on table public.characters to authenticated;

alter table public.character_submissions enable row level security;
revoke all on table public.character_submissions from public, anon, authenticated;
grant insert (name, character_type, contact, facebook_url, instagram_url, x_url, source_note, website)
  on table public.character_submissions to anon, authenticated;
grant select on table public.character_submissions to authenticated;

create or replace function public.is_character_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.character_editors as editor
    where editor.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_character_editor() from public, anon, authenticated;
grant execute on function public.is_character_editor() to authenticated;

create or replace function public.approve_character_submission(p_submission_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  submission_record public.character_submissions%rowtype;
  approved_id uuid;
begin
  if not coalesce((select public.is_character_editor()), false) then
    raise exception 'Not authorized to approve proposals' using errcode = '42501';
  end if;

  select submission.* into submission_record
  from public.character_submissions as submission
  where submission.id = p_submission_id
    and submission.status = 'pending'
  for update of submission;

  if not found then
    raise exception 'Proposal not found or already reviewed' using errcode = 'P0002';
  end if;

  insert into public.characters (
    name, character_type, contact, facebook_url, instagram_url, x_url, image_path, updated_at
  ) values (
    submission_record.name,
    submission_record.character_type,
    nullif(btrim(submission_record.contact), ''),
    nullif(btrim(submission_record.facebook_url), ''),
    nullif(btrim(submission_record.instagram_url), ''),
    nullif(btrim(submission_record.x_url), ''),
    null,
    now()
  ) returning id into approved_id;

  update public.character_submissions
  set status = 'approved',
      reviewed_at = now(),
      reviewed_by = (select auth.uid()),
      approved_character_id = approved_id
  where id = submission_record.id;

  return approved_id;
end;
$$;
revoke all on function public.approve_character_submission(uuid) from public, anon, authenticated;
grant execute on function public.approve_character_submission(uuid) to authenticated;

create or replace function public.reject_character_submission(p_submission_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  rejected_id uuid;
begin
  if not coalesce((select public.is_character_editor()), false) then
    raise exception 'Not authorized to review proposals' using errcode = '42501';
  end if;

  update public.character_submissions
  set status = 'rejected',
      reviewed_at = now(),
      reviewed_by = (select auth.uid())
  where id = p_submission_id
    and status = 'pending'
  returning id into rejected_id;

  if rejected_id is null then
    raise exception 'Proposal not found or already reviewed' using errcode = 'P0002';
  end if;

  return true;
end;
$$;
revoke all on function public.reject_character_submission(uuid) from public, anon, authenticated;
grant execute on function public.reject_character_submission(uuid) to authenticated;

drop policy if exists "Characters are readable by everyone" on public.characters;
create policy "Characters are readable by everyone"
on public.characters for select
to anon, authenticated
using (true);

drop policy if exists "Authorized editors can add characters" on public.characters;
create policy "Authorized editors can add characters"
on public.characters for insert
to authenticated
with check ((select public.is_character_editor()));

drop policy if exists "Authorized editors can update characters" on public.characters;
create policy "Authorized editors can update characters"
on public.characters for update
to authenticated
using ((select public.is_character_editor()))
with check ((select public.is_character_editor()));

drop policy if exists "Visitors can submit pending proposals" on public.character_submissions;
create policy "Visitors can submit pending proposals"
on public.character_submissions for insert
to anon, authenticated
with check (
  status = 'pending'
  and reviewed_at is null
  and reviewed_by is null
  and approved_character_id is null
  and website = ''
);

drop policy if exists "Only the editor can read proposals" on public.character_submissions;
create policy "Only the editor can read proposals"
on public.character_submissions for select
to authenticated
using ((select public.is_character_editor()));

-- Las fotos sólo las sube la cuenta editorial tras la aprobación de una propuesta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'character-photos',
  'character-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authorized editors can upload character photos" on storage.objects;
create policy "Authorized editors can upload character photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'character-photos'
  and (select public.is_character_editor())
);

drop policy if exists "Authorized editors can update character photos" on storage.objects;
create policy "Authorized editors can update character photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'character-photos'
  and (select public.is_character_editor())
)
with check (
  bucket_id = 'character-photos'
  and (select public.is_character_editor())
);

drop policy if exists "Authorized editors can delete character photos" on storage.objects;
create policy "Authorized editors can delete character photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'character-photos'
  and (select public.is_character_editor())
);

comment on table public.character_submissions is
  'Propuestas privadas de personajes; sólo el editor único puede leerlas, aprobarlas o rechazarlas.';

commit;

-- Para activar la cuenta: desactiva el registro público en Authentication settings,
-- crea tu usuario desde Authentication > Users y luego añade su UUID como único editor:
-- insert into private.character_editors (user_id)
-- select id from auth.users where lower(email) = lower('TU_CORREO')
-- on conflict (user_id) do nothing;
