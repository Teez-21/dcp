# Configuración de Supabase para los módulos públicos

El sitio conserva la exportación estática a GitHub Pages. Supabase se conecta desde el navegador con una clave **publishable**; las reglas RLS protegen cada operación. No se debe usar una clave `service_role` ni `sb_secret_` en la web, en GitHub Pages ni en el workflow de build.

## Coste y límites

La base compartida está diseñada para **Supabase Free ($0/mes)**. A fecha del **2 de octubre de 2026**, la página oficial publica 500 MB de base de datos, 1 GB de almacenamiento de archivos, 5 GB de egress, 50.000 usuarios activos mensuales y hasta 2 proyectos activos. Los proyectos Free pueden pausarse tras una semana de inactividad y las cuotas pueden cambiar. No hace falta contratar un plan pago para los módulos actuales.

La búsqueda de direcciones es opcional y se integra con **Geoapify Free** sólo si se configura su clave. La tarifa oficial publica 3.000 créditos al día, hasta 5 solicitudes por segundo y registro sin tarjeta; la geocodificación sencilla cuesta normalmente 1 crédito. La cuota se comparte entre todas las personas que usan el sitio y Geoapify puede limitar el servicio si el uso excede habitualmente el plan. Sin esa clave, siguen disponibles las búsquedas locales de puestos y puntos ya aprobados, además de la colocación manual de un punto en el mapa.

## Estado de esta instancia

El proyecto **DCP** está activo en el plan Free. El esquema de personajes y las migraciones de privacidad ya estaban aplicados; el **3 de octubre de 2026** se añadió también la migración `interest_sites_hub`. Existe una sola cuenta Auth permanente y verificada, registrada en el slot editorial único. La usuaria confirmó que desactivó el registro público de Auth y configuró los secrets de Supabase en GitHub Actions. La integración de GitHub no permite leer esos secrets (HTTP 403), por lo que sus valores no se verificaron ni se intentó eludir ese permiso.

## Cómo funcionan las propuestas

### Personajes importantes

Cualquier visitante puede enviar una ficha sin cuenta. Cada propuesta se guarda como `pending` en `public.character_submissions`; la bandeja, el contacto y las notas de revisión no son públicos. Sólo la cuenta editorial única puede aprobar o rechazar. Aprobar crea la ficha pública; rechazar no la publica. Por seguridad y por la cuota gratuita, una propuesta anónima no sube fotos; el editor puede agregarlas después de aprobar. Los contactos y enlaces pueden ser públicos, así que sólo se debe aprobar información destinada a publicación.

### Sitios de interés

Cualquier visitante puede buscar puestos de votación y lugares, elegir una ubicación haciendo clic sobre el mapa y enviar una propuesta **sin crear una cuenta**. El formulario guarda nombre, tipo, descripción, referencia opcional, fuente y coordenadas. Las propuestas se mantienen privadas en `public.interest_site_submissions`; la tabla `public.interest_sites` contiene sólo puntos aprobados y es de lectura pública. Únicamente la cuenta editorial existente puede leer la cola y usar las funciones transaccionales de aprobar/rechazar. Las coordenadas quedan limitadas al área amplia de Bogotá.

El texto de una búsqueda externa se envía a Geoapify sólo cuando la persona pulsa **Buscar**; no hay autocompletado. La búsqueda está limitada a Bogotá y el sitio informa que consulta al proveedor. La clave se inserta en JavaScript público por diseño: hay que restringirla por origen al dominio `https://teez-21.github.io`; no es una clave secreta. La integración no está bloqueada si falta la variable.

## Instalación / migraciones

En una instalación nueva:

1. Mantén Supabase en el plan **Free** y desactiva **Allow new users to sign up** en Auth. Conserva el inicio de sesión por email/contraseña para la cuenta editorial. No actives *anonymous sign-ins*: las propuestas usan el rol Postgres `anon`, no usuarios temporales.
2. En SQL Editor, ejecuta primero `supabase/schema.sql` para el esquema base de personajes y privacidad; después ejecuta `supabase/migrations/20261003_interest_sites.sql` para crear las tablas, políticas y funciones de Sitios de interés.
3. En **Authentication → Users**, crea o invita únicamente tu cuenta editorial. El esquema permite un solo slot en `private.character_editors`; una cuenta Auth adicional no adquiere permisos editoriales.
4. En **Project Settings → API Keys**, copia el Project URL y la clave **publishable** (o la clave pública `anon` heredada). Nunca uses `service_role` ni `sb_secret_` en el cliente.

En DCP las migraciones ya se aplicaron y la editora única ya quedó vinculada.

## GitHub Pages y variables

En el repositorio `Teez-21/dcp`, abre **Settings → Secrets and variables → Actions** y conserva estos repository secrets:

| Variable | Requerida | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL HTTPS del proyecto DCP. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí | Clave pública del cliente; jamás una clave de servicio. |
| `NEXT_PUBLIC_GEOAPIFY_API_KEY` | No | Clave de navegador Geoapify Free para búsquedas externas de direcciones. |

Para habilitar direcciones/lugares externos, crea una cuenta Geoapify Free sin tarjeta, crea una API key y limita el referer/origen al sitio. Después añade `NEXT_PUBLIC_GEOAPIFY_API_KEY` en **Actions secrets** y vuelve a desplegar. La búsqueda externa sólo quedará activa cuando exista la variable. Copia `.env.example` a `.env.local` para desarrollo local; `.env.local` está excluido de Git.

El workflow detiene la publicación si falta Supabase o si la clave no es pública/segura. Geoapify no es obligatoria: su variable vacía no bloquea el deploy.

## Permisos aplicados

| Recurso | Visitantes (`anon`) | Cuenta Auth común | Única editora |
|---|---|---|---|
| `characters` aprobados | Lectura | Lectura | Lectura y edición permitida |
| Propuestas de personajes | Insertar formulario limitado; sin leer/modificar/aprobar | Sin acceso a cola | Leer, aprobar o rechazar |
| `interest_sites` aprobados | Lectura | Lectura | Lectura |
| Propuestas de Sitios de interés | Insertar propuesta pendiente; sin leer/modificar/aprobar | No puede leer la cola | Leer, aprobar o rechazar mediante RPC |

Las tablas nuevas tienen RLS habilitado. Se verificó que `anon` puede leer puntos aprobados y enviar propuestas, no puede leer la cola ni ejecutar las RPC de moderación. La auditoría no reporta tablas nuevas con RLS sin políticas. Las funciones `SECURITY DEFINER` sólo se ejecutan como Auth y vuelven a comprobar en la base la pertenencia al slot editorial; el asesor las marca como advertencia porque deliberadamente necesitan privilegios de moderación. También permanece la advertencia de protección de contraseñas filtradas desactivada; no se modificó esa configuración.

El formulario usa límites de longitud y un campo señuelo (honeypot), que es una barrera básica, **no un límite de frecuencia ni protección completa contra spam**. Si llega abuso, habrá que agregar CAPTCHA verificado en servidor u otra medida anti-abuso. No se requieren fotos ni información de contacto para proponer un Sitio de interés.

## Pruebas

`supabase/tests/` contiene pruebas pgTAP para personajes, fotos y Sitios de interés. `interest_sites_rls.test.sql` tiene 31 aserciones para lectura pública, propuesta anónima, privacidad de la cola, honeypot, límites geográficos y aprobación/rechazo por la única editora. La migración y el test pasaron análisis sintáctico PostgreSQL local; en DCP se verificaron RLS, políticas, grants, permisos de RPC, historial y asesoría de seguridad. La batería completa pgTAP no se ejecutó porque este entorno no tiene Supabase CLI/Docker.

## Referencias oficiales

- [Supabase Pricing](https://supabase.com/pricing) — cuotas Free y pausa de proyectos.
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — grants y políticas RLS.
- [Supabase Auth: configuración general](https://supabase.com/docs/guides/auth/general-configuration) y [Users](https://supabase.com/docs/guides/auth/users).
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control) — políticas de archivos para el Hub de personajes.
- [Geoapify Pricing](https://www.geoapify.com/pricing/) — créditos gratuitos, límites y atribución.
- [Geoapify Geocoding](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/) — parámetros de búsqueda y filtro espacial.
- [Política de uso de Nominatim](https://operations.osmfoundation.org/policies/nominatim/) — motivo por el que no se eligió el endpoint público genérico en esta aplicación.
