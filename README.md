# Datos a tener en cuenta

Dashboard de inteligencia política y electoral de Bogotá, construido con Next.js 14, TypeScript, Tailwind CSS, Leaflet y Zustand. El sitio se exporta como archivos estáticos y se despliega en GitHub Pages.

## Estado actual

- Dashboard editorial oscuro con acento morado `#c4b5fd`.
- Mapa electoral por **Localidad, UPZ y puesto de votación**, con círculos de ganador/segundo y diferencia absoluta o porcentual.
- La elección **Cámara de Representantes · Bogotá 2026–2030** se genera desde el MMV adjunto: 823.114 filas de mesa, 18.134 mesas, 1.082 puestos, 20 localidades, 215 candidaturas y 15 partidos. La vista por partidos suma votos preferentes y de lista; la vista por candidatura conserva los resultados individuales. Los tipos especiales (212.214 votos en el archivo fuente) y los códigos zonales 90/98 se preservan en metadatos pero no se distribuyen entre localidades. Los 1.082 puestos se vinculan a coordenadas, por código o por el nombre normalizado del puesto.
- Capas GeoJSON precargadas de las 20 localidades y 112 UPZ; el cruce espacial permite agregar los puestos por UPZ.
- **Sitios de interés** vive sobre una capa independiente de las votaciones. Se pueden buscar puestos y puntos ya aprobados sin clave externa, proponer una ubicación con un clic en el mapa y enviarla sin crear cuenta. Las propuestas quedan privadas hasta que la cuenta editorial única las aprueba; los puntos aprobados son visibles para todos.
- La búsqueda externa de direcciones/lugares es opcional: requiere la variable `NEXT_PUBLIC_GEOAPIFY_API_KEY` (Geoapify Free). Sin ella sigue funcionando la búsqueda local de puestos/puntos y la marcación manual. No se usa el servidor público Nominatim para autocompletar.
- La tarjeta 01 ahora abre **Datos sobre el Concejo de Bogotá** en `/concejo/`, con regreso al inicio y acceso al mapa configurado en Concejo. El contenido que aún no cuenta con fuentes se identifica como pendiente en lugar de inventar cifras.
- **Personajes importantes** abre `/personajes/`. Cualquier visitante puede proponer una ficha sin cuenta; sólo la única cuenta editorial puede revisarla, aprobarla o rechazarla. Las fichas aprobadas son flashcards con contacto, Facebook, Instagram, X, tipo y edición; las fotos se agregan desde la sesión editorial.
- **Sugerencias** permite crear temas con entradas; por ahora sus datos se guardan en el navegador de quien los crea. Las demás tarjetas siguen siendo visuales o esperan sus propios módulos.

## Persistencia y permisos

Supabase DCP está activo en plan **Free** y contiene el esquema de personajes y Sitios de interés. Las propuestas de ambas secciones son anónimas, privadas mientras esperan revisión, y las puede moderar sólo la cuenta editorial única. Visitantes pueden leer personajes y puntos aprobados, pero no leer la cola ni aprobar elementos. RLS impide escrituras directas al directorio público. Los formularios incluyen un honeypot básico; no constituye protección completa contra spam. No se usan claves `service_role` en la aplicación.

La guía de configuración está en [SUPABASE_SETUP.md](SUPABASE_SETUP.md). El esquema base, migraciones y pruebas SQL están en `supabase/`. La búsqueda externa y sus fuentes se documentan en [MAP_SEARCH_NOTES.md](MAP_SEARCH_NOTES.md). No hace falta plan pago de Supabase para las funciones actuales; consulta las [cuotas oficiales](https://supabase.com/pricing).

## Desarrollo local

Requisitos: Node.js 22 (o una versión compatible con Next.js 14).

```bash
npm ci
npm run dev
```

Abre <http://localhost:3000>. Para conectar Supabase, copia `.env.example` a `.env.local` y completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Para habilitar búsquedas externas, agrega también `NEXT_PUBLIC_GEOAPIFY_API_KEY`. `.env.local` está excluido de Git.

Para validar/exportar el sitio:

```bash
NEXT_PUBLIC_BASE_PATH=/dcp npm run build
```

## GitHub Pages

El workflow `.github/workflows/deploy-pages.yml` se ejecuta al publicar cambios en `main` y compila la exportación con `NEXT_PUBLIC_BASE_PATH=/dcp`. `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` son requeridas como repository secrets de Actions; Geoapify es opcional. No guardes claves privadas de servicio en el repositorio ni en bundles del navegador.

Sitio existente: <https://teez-21.github.io/dcp/>.

## Estructura relevante

```text
src/app/                         rutas estáticas y estilos globales
src/app/concejo/                 página Datos sobre el Concejo de Bogotá
src/components/dashboard/        dashboard, mapa y Sitios de interés
src/components/characters/       interfaz del Hub Personajes importantes
src/data/                        datos electorales normalizados
scripts/                         conversores reproducibles de los MMV
src/lib/                         lógica electoral y clientes
src/store/                       estado del dashboard/Sugerencias
supabase/schema.sql              esquema base de personajes y Storage
supabase/migrations/             migraciones aditivas de producción
supabase/tests/                  pruebas pgTAP
```

## Nota de dependencias

`npm run build` compila el sitio estático. `npm audit` todavía reporta una vulnerabilidad crítica en Next.js y una alta en PostCSS; la corrección automática propuesta requiere Next.js 16 (cambio mayor), así que no se aplicó dentro de esta funcionalidad y debe tratarse en una actualización separada con pruebas de compatibilidad.
