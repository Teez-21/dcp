-- Branding: catálogo de paletas y observaciones públicas.
-- Compatible con la estructura de branding existente en Supabase DCP.
begin;

create table if not exists public.brand_palettes (
  id text primary key,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  colors jsonb not null check (jsonb_typeof(colors) = 'array' and jsonb_array_length(colors) between 1 and 8),
  roles jsonb not null default '[]'::jsonb,
  role_labels jsonb not null default '[]'::jsonb,
  is_preset boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brand_palette_observations (
  id uuid primary key default gen_random_uuid(),
  palette_id text not null,
  observation text not null check (char_length(btrim(observation)) between 1 and 1200),
  website text not null default '' check (char_length(website) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists brand_palettes_sort_order_idx on public.brand_palettes (sort_order, id);
create index if not exists brand_palette_observations_palette_idx on public.brand_palette_observations (palette_id, created_at desc);
alter table public.brand_palettes enable row level security;
alter table public.brand_palette_observations enable row level security;
revoke all on table public.brand_palettes from public, anon, authenticated;
revoke all on table public.brand_palette_observations from public, anon, authenticated;
grant select on table public.brand_palettes to anon, authenticated;
grant select, insert on table public.brand_palette_observations to anon, authenticated;
grant insert, update on table public.brand_palettes to authenticated;

drop policy if exists "Public can read branding palettes" on public.brand_palettes;
create policy "Public can read branding palettes" on public.brand_palettes for select to anon, authenticated using (true);
drop policy if exists "Only the sole editor can create branding palettes" on public.brand_palettes;
create policy "Only the sole editor can create branding palettes" on public.brand_palettes for insert to authenticated with check ((select public.is_character_editor()));
drop policy if exists "Only the sole editor can update branding palettes" on public.brand_palettes;
create policy "Only the sole editor can update branding palettes" on public.brand_palettes for update to authenticated using ((select public.is_character_editor())) with check ((select public.is_character_editor()));
drop policy if exists "Public can read branding observations" on public.brand_palette_observations;
create policy "Public can read branding observations" on public.brand_palette_observations for select to anon, authenticated using (true);
drop policy if exists "Visitors can add public branding observations" on public.brand_palette_observations;
create policy "Visitors can add public branding observations" on public.brand_palette_observations for insert to anon, authenticated with check (website = '' and char_length(btrim(observation)) between 1 and 1200);

comment on table public.brand_palettes is 'Paletas de marca: lectura pública y edición limitada a la cuenta editorial.';
comment on table public.brand_palette_observations is 'Observaciones públicas de sólo adición, sin nombre ni datos de autor.';

insert into public.brand_palettes (id, name, colors, roles, role_labels, is_preset, sort_order)
values
('palette-1', 'Paleta 1 · Rojo y blanco', '[{"hex":"#B3262E","name":"Rojo base"},{"hex":"#7E1A22","name":"Rojo profundo"},{"hex":"#FAF8F5","name":"Blanco cálido"},{"hex":"#F1D9D8","name":"Rosa suave"},{"hex":"#1F2328","name":"Tinta"},{"hex":"#5B616B","name":"Pizarra"},{"hex":"#E8E4DE","name":"Piedra"},{"hex":"#FFFFFF","name":"Blanco"}]'::jsonb, '["primary","secondary","background","highlight","text","muted","border","card"]'::jsonb, '["Principal · botones, titulares y marca","Secundario · hover y pie de página","Fondo principal","Fondos de resalte","Texto principal","Texto secundario","Bordes y divisiones","Tarjetas y subtítulos"]'::jsonb, true, 10),
('palette-2', 'Paleta 2 · Púrpura', '[{"hex":"#5B3A8C","name":"Púrpura base"},{"hex":"#3A2360","name":"Ciruela"},{"hex":"#B9A8D6","name":"Lila suave"},{"hex":"#EFEAF6","name":"Lavanda"},{"hex":"#1E1B26","name":"Tinta"},{"hex":"#5E5A6B","name":"Pizarra"},{"hex":"#D6B25E","name":"Oro sobrio"},{"hex":"#FFFFFF","name":"Blanco"}]'::jsonb, '["primary","secondary","accent","background","text","muted","highlight","card"]'::jsonb, '["Principal","Secundario · hover y fondos oscuros","Apoyo · detalles e íconos","Fondos suaves","Texto principal","Texto secundario","Acento mínimo opcional","Tarjetas y subtítulos"]'::jsonb, true, 20),
('palette-3', 'Paleta 3 · Naranja (educación y cultura)', '[{"hex":"#EE6C1F","name":"Naranja vivo"},{"hex":"#F7A13B","name":"Mandarina"},{"hex":"#B5441B","name":"Terracota"},{"hex":"#FFF3E3","name":"Crema"},{"hex":"#26275E","name":"Índigo noche"},{"hex":"#1C9C9A","name":"Turquesa"},{"hex":"#D63A74","name":"Fucsia"},{"hex":"#FFFFFF","name":"Blanco"}]'::jsonb, '["primary","secondary","action","background","text","accent","accent","card"]'::jsonb, '["Principal","Secundario · energía y resaltes","Botones con texto blanco","Fondos","Texto, también sobre naranja","Acento cultural","Acento cultural","Tarjetas"]'::jsonb, true, 30),
('palette-5', 'Paleta 5 · Aguamarina y rojo', '[{"hex":"#0E9CA8","name":"Aguamarina"},{"hex":"#0A4F5C","name":"Mar profundo"},{"hex":"#FAF8F5","name":"Blanco cálido"},{"hex":"#D93A3F","name":"Rojo vivo"},{"hex":"#0F2A33","name":"Tinta"},{"hex":"#E3F4F5","name":"Niebla"},{"hex":"#8F1F2B","name":"Granate"},{"hex":"#F6D5D2","name":"Rosa suave"}]'::jsonb, '["primary","structure","background","action","text","surface","hover","highlight"]'::jsonb, '["Base · 45%","Estructura y fondos oscuros · 25%","Fondos · 20%","Acción · botones y llamados · 10%","Texto","Superficies claras","Hover del rojo","Resaltes suaves"]'::jsonb, true, 50),
('palette-6', 'Paleta 6 · Naranja y rojo', '[{"hex":"#F37021","name":"Naranja vivo"},{"hex":"#232A4D","name":"Índigo"},{"hex":"#D0243A","name":"Carmesí"},{"hex":"#FFF6EC","name":"Crema"},{"hex":"#151A2E","name":"Tinta"},{"hex":"#5C6378","name":"Pizarra"},{"hex":"#8E1B2E","name":"Granate"},{"hex":"#FBB040","name":"Ámbar"}]'::jsonb, '["primary","structure","action","background","text","muted","hover","highlight"]'::jsonb, '["Principal · marca · 40%","Estructura y neutro frío · 25%","Acción · botones y llamados · 20%","Fondos · 15%","Texto principal","Texto secundario","Hover del carmesí","Resaltes pequeños"]'::jsonb, true, 60)
on conflict (id) do update set name = excluded.name, colors = excluded.colors, roles = excluded.roles, role_labels = excluded.role_labels, is_preset = excluded.is_preset, sort_order = excluded.sort_order, updated_at = now();

commit;
