-- Tema global del sitio: el último tema seleccionado se comparte con todos los visitantes.
begin;

create table if not exists public.site_theme (
  id text primary key check (id = 'global'),
  theme text not null check (char_length(btrim(theme)) between 1 and 120),
  updated_at timestamptz not null default now()
);

insert into public.site_theme (id, theme)
values ('global', 'tokyo')
on conflict (id) do nothing;

alter table public.site_theme enable row level security;
revoke all on table public.site_theme from public, anon, authenticated;
grant select, insert, update on table public.site_theme to anon, authenticated;

drop policy if exists "Public can read global site theme" on public.site_theme;
create policy "Public can read global site theme"
  on public.site_theme for select to anon, authenticated
  using (id = 'global');

drop policy if exists "Visitors can update global site theme" on public.site_theme;
create policy "Visitors can update global site theme"
  on public.site_theme for insert to anon, authenticated
  with check (id = 'global' and char_length(btrim(theme)) between 1 and 120);

drop policy if exists "Visitors can save global site theme" on public.site_theme;
create policy "Visitors can save global site theme"
  on public.site_theme for update to anon, authenticated
  using (id = 'global')
  with check (id = 'global' and char_length(btrim(theme)) between 1 and 120);

comment on table public.site_theme is 'Tema visual global seleccionado para todos los visitantes del sitio.';

commit;
