# Configuración de Supabase para “Personajes importantes”

El sitio conserva la exportación estática a GitHub Pages. Supabase se conecta desde el navegador con una clave **publishable** y las reglas RLS protegen cada operación. No se debe usar una clave `service_role` ni `sb_secret_` en la web, GitHub Pages o el workflow de build.

## Coste y límites

La integración está diseñada para **Supabase Free ($0/mes)**. A fecha del **2 de octubre de 2026**, la página oficial publica 500 MB de base de datos, 1 GB de almacenamiento de archivos, 5 GB de egress, 50.000 usuarios activos mensuales y hasta 2 proyectos activos. Las fotos aprobadas se limitan a JPG/PNG/WebP de hasta 5 MB. Los proyectos Free pueden pausarse tras una semana de inactividad. Las cuotas pueden cambiar; no hace falta contratar un plan pago para esta integración.

### Estado de esta instancia

La organización/proyecto **DCP** aparece actualmente en el plan `free` y está activo. El esquema y las dos migraciones del Hub ya están aplicados; la única cuenta Auth permanente y verificada existente quedó registrada como editora única. La usuaria confirmó que desactivó el registro público de Auth y añadió los secrets de GitHub Actions. La integración de GitHub devolvió HTTP 403 al consultar sus secrets, así que no se verificaron sus valores ni se intentará eludir ese permiso.

## Cómo funciona la propuesta anónima

- Cualquier visitante puede enviar una propuesta con nombre, tipo, contacto que podría publicarse, redes y contexto/fuente para revisión. **No necesita crear cuenta ni iniciar sesión.**
- Cada envío queda como `pending` en `public.character_submissions`. La tabla y las notas son privadas: el público no puede leer, editar ni borrar propuestas.
- Sólo la cuenta editorial única puede revisar la bandeja. **Aprobar** copia los datos a `public.characters` dentro de una transacción y hace pública la ficha; **Rechazar** la deja guardada como rechazada, pero no la publica.
- La cuenta única se limita tanto en Supabase Auth (registro público desactivado) como en `private.character_editors` (un solo slot en la base).
- Por seguridad y para cuidar el almacenamiento gratuito, el formulario anónimo no acepta archivos. Si apruebas una ficha, puedes añadir su foto desde la sesión editorial.
- El formulario incluye límites de longitud y un campo señuelo (honeypot). Es una barrera básica, **no un límite de frecuencia ni protección completa contra spam**. Las propuestas no aprobadas no aparecen públicamente, pero un bot sofisticado aún podría enviar muchas; si eso ocurre, hará falta añadir CAPTCHA verificado en servidor o una medida anti-abuso equivalente.

## Crear el proyecto y la única cuenta

1. Para una instalación nueva, crea un proyecto Supabase y mantén el plan **Free**. En esta instancia, DCP ya existe y se confirmó que su organización está en el plan `free`.
2. En **Authentication → Sign In / Providers → Email** (o los ajustes generales de Auth), desactiva **Allow new users to sign up**. Mantén habilitado el inicio de sesión por email/contraseña. No actives *anonymous sign-ins*: las propuestas usan el rol público `anon` de Postgres, no cuentas temporales de Auth.
3. En **SQL Editor**, ejecuta [`supabase/schema.sql`](supabase/schema.sql). El esquema crea el directorio público, la bandeja privada, las funciones de aprobación/rechazo, el bucket de fotos y las políticas RLS. En DCP esta migración ya se aplicó.
4. En **Authentication → Users**, usa **Add user** para crear tu propia cuenta (o invita tu correo y termina de crearla). Guarda el correo con el que iniciarás sesión; no lo compartas aquí. En DCP ya existía exactamente una cuenta permanente verificada.
5. En el SQL Editor, ejecuta la consulta comentada al final de `supabase/schema.sql`, reemplazando `TU_CORREO` por tu correo de Auth. En DCP ya se vinculó la única cuenta existente; la base sólo permite un slot aprobador y rechazará una segunda cuenta.
6. En **Project Settings → API Keys**, copia el **Project URL** y la **Publishable key** (o la clave pública `anon` heredada). No copies `service_role` ni `sb_secret_`.

El proyecto no necesita crear cuentas para quienes envían propuestas. Sólo tú inicias sesión en el Hub para aprobar o rechazar.

## Conectar GitHub Pages

En el repositorio `Teez-21/dcp`, abre **Settings → Secrets and variables → Actions** y crea estos repository secrets:

- `NEXT_PUBLIC_SUPABASE_URL`: el Project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: la clave publishable/anon pública.

No pegues las claves en conversaciones ni las guardes en Git. La clave publishable está pensada para el navegador; la clave `service_role`/`secret` no. El workflow `.github/workflows/deploy-pages.yml` detiene la publicación si la configuración falta o no tiene formato aceptado. El validador de `dev`/`build` también decodifica JWT heredados y rechaza claves con rol `service_role` antes de que Next las incorpore al bundle.

Después de guardar los secrets, ejecuta **Deploy to GitHub Pages** o publica un cambio a `main`. Para desarrollo local, copia `.env.example` a `.env.local` y completa las mismas variables; `.env.local` está excluido de Git.

## Permisos aplicados

- Cualquier visitante puede leer `characters` (sólo fichas ya aprobadas) y las fotos del bucket público.
- `anon` sólo puede insertar las columnas del formulario en `character_submissions`; RLS obliga a que la nueva fila esté pendiente, sin datos de revisión y con el honeypot vacío.
- `anon` no tiene permiso de lectura, edición, borrado ni aprobación. Las cuentas autenticadas comunes tampoco pueden leer la cola.
- Sólo la cuenta de `private.character_editors` ve la bandeja; las funciones `approve_character_submission` y `reject_character_submission` verifican ese permiso dentro de la base.
- La tabla de fichas no da permiso de borrado. El editor puede añadir/editar una ficha publicada y subir, reemplazar o limpiar una foto.
- Las propuestas no aceptan imágenes anónimas; fotos de hasta 5 MB sólo se suben desde la sesión editorial.
- Los contactos y enlaces pueden hacerse públicos al aprobarse; envía únicamente información destinada a publicación.

La revisión de seguridad de Supabase ya no reporta tablas con RLS activo y sin políticas. Mantiene avisos sobre las tres funciones `SECURITY DEFINER` usadas deliberadamente para verificar la editora y realizar la aprobación/rechazo de forma transaccional; usan `search_path` vacío, niegan ejecución a `anon` y vuelven a comprobar el slot editorial. También informa que la opción de protección frente a contraseñas filtradas está desactivada; no se cambió desde la conexión técnica. Usa una contraseña fuerte y activa esa protección en Auth si aparece disponible sin cambiar a un plan pago.

## Pruebas

Los archivos `supabase/tests/` incluyen casos pgTAP para el directorio, Storage y las propuestas. `proposals_rls.test.sql` tiene 34 aserciones para inserción pública, cola oculta, honeypot, cuenta única y transiciones de moderación. La sintaxis SQL se comprobó localmente y en DCP se verificaron los permisos/RLS y el historial de migraciones. Los tests pgTAP completos **no se ejecutaron** porque este entorno no tiene Supabase CLI ni Docker; tampoco están en CI. Al disponer de CLI/Docker, ejecuta `supabase test db` y prueba una propuesta real desde la web.

## Referencias oficiales

- [Supabase Pricing](https://supabase.com/pricing) — cuotas Free y pausa de proyectos, consultado el 2 de octubre de 2026.
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — combinación de grants y políticas RLS.
- [Supabase Auth: configuración general](https://supabase.com/docs/guides/auth/general-configuration) — `Allow new users to sign up` y opciones de autenticación.
- [Supabase Auth: Users](https://supabase.com/docs/guides/auth/users) — usuarios e invitaciones desde Dashboard.
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control) — políticas para archivos.
- [Supabase JavaScript client](https://supabase.com/docs/reference/javascript/initializing) — cliente web y clave publishable.
- [Firebase Pricing](https://firebase.google.com/pricing) — cuotas actuales de Spark/Blaze y disponibilidad de Cloud Storage.
- [Cloud Firestore Pricing](https://cloud.google.com/firestore/pricing) — cuotas de Firestore.
