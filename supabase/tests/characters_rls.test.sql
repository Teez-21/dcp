begin;
select plan(18);

insert into public.characters (id, name, character_type)
values ('11111111-1111-4111-8111-111111111111', 'Ficha de prueba RLS', 'Prueba');

select ok(
  has_table_privilege('anon', 'public.characters', 'select'),
  'anon tiene permiso de lectura'
);
select ok(
  not has_table_privilege('anon', 'public.characters', 'insert,update,delete'),
  'anon no tiene permisos de escritura'
);
select ok(
  has_table_privilege('authenticated', 'public.characters', 'insert,update')
    and not has_table_privilege('authenticated', 'public.characters', 'delete'),
  'authenticated puede intentar alta/edición pero no borrar fichas'
);

set local role anon;
select results_eq(
  $$select name from public.characters where id = '11111111-1111-4111-8111-111111111111'$$,
  array['Ficha de prueba RLS'],
  'los visitantes pueden leer la ficha pública'
);
select throws_ok(
  $$insert into public.characters (name, character_type) values ('No autorizado', 'Prueba')$$,
  '42501', null,
  'un visitante no puede insertar fichas'
);
select throws_ok(
  $$update public.characters set name = 'No autorizado' where id = '11111111-1111-4111-8111-111111111111'$$,
  '42501', null,
  'un visitante no puede editar fichas'
);
select throws_ok(
  $$delete from public.characters where id = '11111111-1111-4111-8111-111111111111'$$,
  '42501', null,
  'un visitante no puede borrar fichas'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select results_eq(
  $$select name from public.characters where id = '11111111-1111-4111-8111-111111111111'$$,
  array['Ficha de prueba RLS'],
  'un usuario autenticado también puede leer las fichas'
);
select throws_ok(
  $$insert into public.characters (name, character_type) values ('No autorizado', 'Prueba')$$,
  '42501', null,
  'un usuario autenticado no autorizado no puede insertar'
);
select throws_ok(
  $$update public.characters set name = 'No autorizado' where id = '11111111-1111-4111-8111-111111111111'$$,
  '42501', null,
  'un usuario autenticado no autorizado no puede editar'
);
select throws_ok(
  $$delete from public.characters where id = '11111111-1111-4111-8111-111111111111'$$,
  '42501', null,
  'un usuario autenticado no autorizado no puede borrar'
);
select is(
  public.is_character_editor(), false,
  'un usuario no incluido en character_editors no obtiene permisos editoriales'
);

reset role;
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (
  '33333333-3333-4333-8333-333333333333',
  'authenticated',
  'authenticated',
  'characters-rls-test@example.test',
  '',
  now(),
  now(),
  now()
)
on conflict (id) do nothing;
insert into private.character_editors (user_id)
values ('33333333-3333-4333-8333-333333333333')
on conflict (user_id) do nothing;

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
set local role authenticated;
select is(
  public.is_character_editor(), true,
  'el usuario incluido en character_editors es editor'
);
select lives_ok(
  $$insert into public.characters (id, name, character_type) values ('44444444-4444-4444-8444-444444444444', 'Ficha de editor', 'Prueba')$$,
  'un editor autorizado puede añadir fichas'
);
select results_eq(
  $$select name from public.characters where id = '44444444-4444-4444-8444-444444444444'$$,
  array['Ficha de editor'],
  'la ficha creada por el editor se puede leer públicamente'
);
select lives_ok(
  $$update public.characters set name = 'Ficha de editor actualizada' where id = '44444444-4444-4444-8444-444444444444'$$,
  'un editor autorizado puede editar fichas'
);
select results_eq(
  $$select name from public.characters where id = '44444444-4444-4444-8444-444444444444'$$,
  array['Ficha de editor actualizada'],
  'la actualización del editor queda guardada'
);
select throws_ok(
  $$delete from public.characters where id = '44444444-4444-4444-8444-444444444444'$$,
  '42501', null,
  'incluso un editor no tiene permiso para borrar fichas'
);

rollback;
