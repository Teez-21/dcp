begin;
select plan(31);

select ok(has_table_privilege('anon', 'public.interest_sites', 'select'), 'anon puede leer Sitios de interés aprobados');
select ok(not has_table_privilege('anon', 'public.interest_sites', 'insert,update,delete'), 'anon no puede escribir ni borrar puntos aprobados');
select ok(has_column_privilege('anon', 'public.interest_site_submissions', 'name', 'insert'), 'anon puede enviar los campos permitidos del formulario');
select ok(not has_column_privilege('anon', 'public.interest_site_submissions', 'status', 'insert'), 'anon no puede asignar el estado de revisión');
select ok(not has_table_privilege('anon', 'public.interest_site_submissions', 'select'), 'anon no puede leer la bandeja privada');
select ok(not has_table_privilege('anon', 'public.interest_site_submissions', 'update,delete'), 'anon no puede cambiar ni borrar propuestas');
select ok(has_table_privilege('authenticated', 'public.interest_site_submissions', 'select'), 'authenticated puede consultar la cola sujeta a RLS editorial');
select ok(has_function_privilege('authenticated', 'public.approve_interest_site_submission(uuid)', 'execute'), 'authenticated puede invocar aprobación protegida por la función');
select ok(not has_function_privilege('anon', 'public.approve_interest_site_submission(uuid)', 'execute'), 'anon no puede aprobar sitios');
select ok(has_function_privilege('authenticated', 'public.reject_interest_site_submission(uuid)', 'execute'), 'authenticated puede invocar rechazo protegido por la función');
select ok(not has_function_privilege('anon', 'public.reject_interest_site_submission(uuid)', 'execute'), 'anon no puede rechazar sitios');

set local role anon;
select lives_ok(
  $$insert into public.interest_site_submissions (name, site_type, description, address, latitude, longitude, source_note)
    values ('Parque de prueba', 'Espacio público', 'Punto temporal de prueba', 'Bogotá', 4.65, -74.1, 'Fuente pública de prueba')$$,
  'un visitante puede enviar una propuesta sin cuenta'
);
select lives_ok(
  $$insert into public.interest_site_submissions (name, site_type, description, latitude, longitude)
    values ('Centro de prueba', 'Cultural', 'Segunda propuesta temporal', 4.61, -74.08)$$,
  'se puede enviar otra propuesta pendiente'
);
select throws_ok($$select * from public.interest_site_submissions$$, '42501', null, 'anon no puede consultar la bandeja privada');
select throws_ok($$update public.interest_site_submissions set status = 'approved' where name = 'Parque de prueba'$$, '42501', null, 'anon no puede autoaprobar');
select throws_ok($$delete from public.interest_site_submissions where name = 'Parque de prueba'$$, '42501', null, 'anon no puede borrar una propuesta');
select throws_ok(
  $$insert into public.interest_site_submissions (name, site_type, description, latitude, longitude, status)
    values ('Autoaprobado', 'Cultural', 'No debe guardarse', 4.65, -74.1, 'approved')$$,
  '42501', null, 'anon no puede enviar una propuesta ya aprobada'
);
select throws_ok(
  $$insert into public.interest_site_submissions (name, site_type, description, latitude, longitude, website)
    values ('Bot', 'Cultural', 'No debe pasar el señuelo', 4.65, -74.1, 'https://spam.invalid')$$,
  '42501', null, 'el honeypot bloquea propuestas que completan el campo señuelo'
);
select throws_ok(
  $$insert into public.interest_site_submissions (name, site_type, description, latitude, longitude)
    values ('Fuera del mapa', 'Otro', 'Coordenada fuera de Bogotá', 40.7, -74.0)$$,
  '23514', null, 'la base rechaza coordenadas fuera del área de Bogotá'
);
select is((select count(*)::integer from public.interest_sites where name = 'Parque de prueba'), 0, 'ninguna propuesta aparece como pública antes de aprobación');
reset role;

select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::integer from public.interest_site_submissions), 0, 'una cuenta Auth ordinaria no puede leer propuestas mediante RLS');
select throws_ok($$select public.approve_interest_site_submission('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid)$$, '42501', null, 'una cuenta no autorizada no puede aprobar');
select throws_ok($$select public.reject_interest_site_submission('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid)$$, '42501', null, 'una cuenta no autorizada no puede rechazar');
reset role;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'single-editor@example.test', '', now(), now(), now())
on conflict (id) do nothing;
insert into private.character_editors (user_id) values ('33333333-3333-4333-8333-333333333333') on conflict (user_id) do nothing;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
set local role authenticated;
select is(public.is_character_editor(), true, 'se reutiliza la única cuenta editorial existente');
select results_eq(
  $$select name from public.interest_site_submissions where status = 'pending' order by name$$,
  array['Centro de prueba', 'Parque de prueba'],
  'la editora ve las propuestas pendientes'
);
select lives_ok(
  $$select public.approve_interest_site_submission((select id from public.interest_site_submissions where name = 'Parque de prueba'))$$,
  'la editora puede aprobar y publicar un punto'
);
select results_eq($$select name from public.interest_sites where name = 'Parque de prueba'$$, array['Parque de prueba'], 'el punto aprobado queda en el directorio público');
select is((select status from public.interest_site_submissions where name = 'Parque de prueba'), 'approved', 'la propuesta aprobada cambia de estado');
select is((select reviewed_by from public.interest_site_submissions where name = 'Parque de prueba'), '33333333-3333-4333-8333-333333333333'::uuid, 'la aprobación queda auditada con la cuenta editorial');
select lives_ok(
  $$select public.reject_interest_site_submission((select id from public.interest_site_submissions where name = 'Centro de prueba'))$$,
  'la editora puede rechazar una propuesta'
);
select is((select status from public.interest_site_submissions where name = 'Centro de prueba'), 'rejected', 'la propuesta rechazada no se publica');
reset role;

rollback;
