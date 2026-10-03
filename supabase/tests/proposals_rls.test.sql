begin;
select plan(34);

select ok(
  not has_schema_privilege('anon', 'private', 'usage'),
  'anon no puede inspeccionar el esquema privado de editores'
);
select ok(
  not has_schema_privilege('authenticated', 'private', 'usage'),
  'las cuentas autenticadas no pueden inspeccionar el esquema privado'
);
select ok(
  not has_table_privilege('authenticated', 'private.character_editors', 'select'),
  'la pertenencia editorial no se expone directamente por SQL'
);

select ok(
  has_column_privilege('anon', 'public.character_submissions', 'name', 'insert'),
  'anon puede insertar sólo las columnas del formulario público'
);
select ok(
  not has_column_privilege('anon', 'public.character_submissions', 'status', 'insert'),
  'anon no puede asignar por sí mismo el estado de revisión'
);
select ok(
  not has_table_privilege('anon', 'public.character_submissions', 'select'),
  'anon no puede leer la bandeja privada'
);
select ok(
  not has_table_privilege('anon', 'public.character_submissions', 'update,delete'),
  'anon no puede cambiar ni borrar propuestas'
);
select ok(
  has_table_privilege('authenticated', 'public.character_submissions', 'select'),
  'authenticated puede consultar la cola, sujeta a RLS de editor'
);
select ok(
  not has_table_privilege('authenticated', 'public.character_submissions', 'update,delete'),
  'authenticated no puede modificar ni borrar directamente propuestas'
);
select ok(
  has_function_privilege('authenticated', 'public.approve_character_submission(uuid)', 'execute'),
  'authenticated puede invocar la función de aprobación, que valida el permiso editorial'
);
select ok(
  not has_function_privilege('anon', 'public.approve_character_submission(uuid)', 'execute'),
  'anon no puede invocar la función de aprobación'
);

set local role anon;
select lives_ok(
  $$insert into public.character_submissions (name, character_type, contact, source_note)
    values ('Propuesta anónima', 'Líder social', 'contacto público', 'Fuente para revisión')$$,
  'un visitante puede enviar una propuesta pendiente sin iniciar sesión'
);
select lives_ok(
  $$insert into public.character_submissions (name, character_type)
    values ('Segunda propuesta', 'Funcionario')$$,
  'un visitante puede enviar otra propuesta pendiente'
);
select throws_ok(
  $$select * from public.character_submissions$$,
  '42501', null,
  'un visitante no puede leer propuestas ni notas privadas'
);
select throws_ok(
  $$update public.character_submissions set status = 'approved' where name = 'Propuesta anónima'$$,
  '42501', null,
  'un visitante no puede cambiar una propuesta'
);
select throws_ok(
  $$delete from public.character_submissions where name = 'Propuesta anónima'$$,
  '42501', null,
  'un visitante no puede borrar una propuesta'
);
select throws_ok(
  $$insert into public.character_submissions (name, character_type, status)
    values ('Autoaprobación', 'Prueba', 'approved')$$,
  '42501', null,
  'un visitante no puede enviar una propuesta autoaprobada'
);
select throws_ok(
  $$insert into public.character_submissions (name, character_type, website)
    values ('Bot', 'Prueba', 'https://bot.example')$$,
  '42501', null,
  'el honeypot bloquea propuestas que completan el campo señuelo'
);
select is(
  (select count(*)::integer from public.characters where name = 'Propuesta anónima'),
  0,
  'las propuestas no aparecen en el directorio público antes de aprobación'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select is(public.is_character_editor(), false, 'una cuenta común no es editor');
select is(
  (select count(*)::integer from public.character_submissions),
  0,
  'una cuenta común no puede leer la bandeja editorial'
);
select throws_ok(
  $$select public.approve_character_submission('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid)$$,
  '42501', null,
  'una cuenta no autorizada no puede aprobar propuestas'
);
select throws_ok(
  $$select public.reject_character_submission('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid)$$,
  '42501', null,
  'una cuenta no autorizada no puede rechazar propuestas'
);
select throws_ok(
  $$update public.character_submissions set status = 'rejected'$$,
  '42501', null,
  'una cuenta común no puede cambiar directamente la bandeja'
);
reset role;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'single-editor@example.test', '', now(), now(), now()),
  ('55555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'second-editor@example.test', '', now(), now(), now())
on conflict (id) do nothing;
insert into private.character_editors (user_id)
values ('33333333-3333-4333-8333-333333333333')
on conflict (user_id) do nothing;
select throws_ok(
  $$insert into private.character_editors (user_id) values ('55555555-5555-4555-8555-555555555555')$$,
  '23505', null,
  'la base de datos permite una sola cuenta editorial'
);

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
set local role authenticated;
select is(public.is_character_editor(), true, 'la única cuenta autorizada es editora');
select results_eq(
  $$select name from public.character_submissions where status = 'pending' order by name$$,
  array['Propuesta anónima', 'Segunda propuesta'],
  'la editora puede ver las propuestas pendientes'
);
select lives_ok(
  $$select public.approve_character_submission((select id from public.character_submissions where name = 'Propuesta anónima'))$$,
  'la editora puede aprobar una propuesta'
);
select results_eq(
  $$select name from public.characters where name = 'Propuesta anónima'$$,
  array['Propuesta anónima'],
  'sólo la aprobación copia la propuesta al directorio público'
);
select is(
  (select status from public.character_submissions where name = 'Propuesta anónima'),
  'approved',
  'la propuesta queda marcada como aprobada'
);
select is(
  (select reviewed_by from public.character_submissions where name = 'Propuesta anónima'),
  '33333333-3333-4333-8333-333333333333'::uuid,
  'la aprobación queda auditada con el UUID de la editora'
);
select lives_ok(
  $$select public.reject_character_submission((select id from public.character_submissions where name = 'Segunda propuesta'))$$,
  'la editora puede rechazar una propuesta'
);
select is(
  (select status from public.character_submissions where name = 'Segunda propuesta'),
  'rejected',
  'la propuesta rechazada no se publica'
);
select is(
  (select count(*)::integer from public.character_submissions where status = 'pending'),
  0,
  'las propuestas aprobadas o rechazadas salen de la cola pendiente'
);

rollback;
