begin;
select plan(3);

select is(
  (select public from storage.buckets where id = 'character-photos'),
  true,
  'las fotos se sirven desde un bucket público de sólo lectura'
);

set local role anon;
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('character-photos', 'characters/unauthorized.jpg')$$,
  '42501', null,
  'un visitante no puede subir fotos'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('character-photos', 'characters/unauthorized-user.jpg')$$,
  '42501', null,
  'un usuario autenticado no autorizado no puede subir fotos'
);

rollback;
