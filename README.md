# Datos a tener en cuenta

Dashboard de inteligencia política y electoral de Bogotá, construido con Next.js 14, TypeScript, Tailwind CSS, Leaflet y Zustand. El sitio se exporta como archivos estáticos y se despliega en GitHub Pages.

## Estado actual

- Dashboard editorial oscuro con acento morado `#c4b5fd`.
- Mapa electoral con vistas por **Localidad, UPZ y puesto de votación**. Los datos de Alcaldía 2023 usan el MMV detallado: 957 puestos y sus resultados agregados.
- Capas GeoJSON precargadas de las 20 localidades y 112 UPZ; el cruce espacial permite agregar los resultados de los puestos por UPZ.
- **Sugerencias** permite crear temas con entradas; por ahora sus datos se guardan en el navegador de quien los crea.
- La tarjeta **Personajes importantes** abre `/personajes/`. Cualquier visitante puede proponer una ficha sin cuenta; sólo la única cuenta editorial puede revisar, aprobar o rechazarla. Las fichas aprobadas se muestran como flashcards con contacto/Facebook/Instagram/X; el editor puede añadir o editar datos y subir fotos después de aprobar.
- Las demás tarjetas de módulos siguen siendo visuales o están pendientes de sus propias funciones.

## Supabase para el Hub

La integración usa **Supabase Free**. El proyecto DCP está activo en plan gratuito; el esquema ya está aplicado y la única cuenta Auth permanente existente está registrada como editora. `characters` sólo contiene fichas aprobadas y es de lectura pública. Las propuestas van a una tabla privada: `anon` puede enviar campos limitados, pero no verlas, cambiarlas ni aprobarlas; la base impone un único slot editorial. No se guardan fichas en `localStorage`, no se aceptan fotos anónimas y el formulario incluye honeypot básico (no equivale a protección completa anti-spam). Los scripts de `dev`/`build` rechazan claves `service_role`/`secret`. Auth y los dos secrets de Actions quedaron configurados; el Hub está publicado en [teez-21.github.io/dcp/personajes/](https://teez-21.github.io/dcp/personajes/).

La guía de configuración de Supabase está en [SUPABASE_SETUP.md](SUPABASE_SETUP.md). El SQL reproducible está en `supabase/schema.sql`; las pruebas pgTAP están en `supabase/tests/`. En DCP ya existe una sola editora y se configuraron Auth y Actions Secrets. No es necesario activar un plan pago; revisa las cuotas y pausas vigentes en la [página oficial de precios](https://supabase.com/pricing).

## Desarrollo local

Requisitos: Node.js 22 (o una versión compatible con Next.js 14).

```bash
npm ci
npm run dev
```

Abre <http://localhost:3000>. Para la conexión local del Hub, copia `.env.example` a `.env.local` y completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; el archivo local está excluido de Git.

Para validar/exportar el sitio:

```bash
npm run build
```

## GitHub Pages

El workflow `.github/workflows/deploy-pages.yml` se ejecuta al publicar cambios en `main` y compila la exportación estática con `NEXT_PUBLIC_BASE_PATH=/dcp`. Para que el Hub comparta datos, agrega los repository secrets descritos en [SUPABASE_SETUP.md](SUPABASE_SETUP.md); no guardes claves de servicio en el repositorio.

Sitio existente: <https://teez-21.github.io/dcp/>.

## Estructura relevante

```text
src/app/                         rutas estáticas y estilos globales
src/components/dashboard/        dashboard, mapa y módulos
src/components/characters/       interfaz del Hub Personajes importantes
src/data/                        datos electorales normalizados
src/lib/                         lógica electoral y cliente Supabase
src/store/                       estado del dashboard/Sugerencias
supabase/schema.sql              esquema, bucket y políticas RLS
supabase/tests/                  casos pgTAP
```

## Nota de dependencias

La compilación actual pasa. `npm audit` todavía reporta una vulnerabilidad crítica en Next.js y una alta en PostCSS; la corrección sugerida automáticamente requeriría pasar a Next.js 16 (cambio mayor), por lo que no se aplicó como parte de esta funcionalidad y debe tratarse en una actualización separada con pruebas de compatibilidad.
