# Avance del proyecto — Datos a tener en cuenta

**Corte:** 3 de octubre de 2026. **Estado vigente:** la nueva versión quedó publicada en GitHub Pages (commit `2fc63eb`, ejecución `37161739481` exitosa). El dashboard, el Hub de personajes y los módulos de Cámara, Concejo y Sitios de interés están en producción. Supabase DCP sigue en Free; las tablas y permisos RLS están aplicados y Auth limita la moderación a una sola cuenta editorial. La usuaria confirmó los dos secrets obligatorios de Supabase y que desactivó el registro público.

## Resumen

Se conservaron los cambios visuales solicitados, se reemplazó la base de Alcaldía por el MMV adjunto y se integraron los niveles Localidad/UPZ/Puesto en el mapa. El MMV de Cámara se agregó como una elección nueva, sin reemplazar Alcaldía ni Concejo. La versión actual está publicada en <https://teez-21.github.io/dcp/>; incluye `/personajes/`, `/concejo/` y Sitios de interés conectado a Supabase Free.

## Interfaz

| Estado | Trabajo |
|---|---|
| Hecho | Se restauraron los estilos globales y el diseño oscuro editorial; el acento es morado `#c4b5fd`. Se retiró la frase final. **Bitácora** se convirtió en **Sugerencias**, con temas y entradas persistentes. |
| Hecho | Se conectaron las capas estáticas de localidades y UPZ con el selector Localidad/UPZ/Puesto; la vista Puesto usa marcadores con primer y segundo lugar y diferenciación absoluta/porcentual. |
| Hecho | Se creó y publicó `/personajes/` y el enlace desde la tarjeta. Cualquier visitante puede proponer fichas sin cuenta; quedan privadas hasta que la única cuenta editorial las apruebe o rechace. El sitio usa el esquema real de DCP. |

## Base de Alcaldía

`src/data/alcaldia-2023.json` se generó a partir de `MMV_2023_16_BOGOTA_ALCALDE.csv`, agregando las 17.518 mesas por puesto. Incluye **957 puestos**, **20 localidades** y **9 candidatos**. El total nuevo en localidades es **2.880.530 votos de candidatos**, frente a **2.879.176** en la base anterior (**+1.354 netos**); los totales por candidatura también varían.

Se agregó el marcador `alcaldia-mmv-2023-v1` y una migración que actualiza la Alcaldía persistida en el navegador al recargar. Conserva preferencias de nombres/colores de candidatos y no reemplaza las demás elecciones. El MMV no incluye coordenadas, por lo que los puestos aparecen sin coordenadas. Para esta vista se excluyeron **26.211 votos de candidatos** que no pertenecen a las localidades 01–20 y **217.979 votos no candidatos** (blancos, nulos y no marcados), ya que el formato actual almacena votos de candidatos. El conversor está en `scripts/convert_alcaldia_mmv.py`; la copia anterior queda fuera del proyecto, en la caché privada del espacio de trabajo.

`public/data/concejo-2023.json` está incluido en la versión actual del proyecto; el cargador precargado del Concejo lo obtiene por HTTP. No se reprocesó como parte de la sustitución de Alcaldía.

## MMV de Cámara · Bogotá 2026–2030

Se procesó el CSV adjunto con `scripts/convert_camara_mmv.py` y se publicó `public/data/camara-2026.json` (3.110.890 bytes). El archivo fuente contiene **823.114 filas**, **18.134 mesas**, **1.082 puestos**, **215 candidaturas**, **15 partidos** y zonas de las **20 localidades**. El store carga esta elección bajo el identificador `camara`, por defecto en vista de partidos; se conservan las demás elecciones y la vista por candidatura. La leyenda incluye también partidos que sólo tuvieron votos de lista.

El conversor mantiene separados los tipos `candidato`, `lista` y `especial`: los totales del archivo fuente son 1.323.343 votos de candidato, 1.386.226 de lista y 212.214 especiales. En la vista territorial de localidades se agregan las zonas 01–20; los códigos 90/98 quedan en metadatos y no se asignan a una localidad. Los 1.082 puestos tienen cruce a coordenadas: 1.081 por código y el restante mediante nombre normalizado. La suma por partido agrega los votos de lista y preferentes; la vista por candidato muestra sus votos preferentes.

## Cruce de UPZ y localidades

Se procesó el ArcGIS JSON `IndUPZ.json` (112 códigos únicos, EPSG:4686) y se cruzó con `poligonos-localidades.geojson` (20 localidades). Las áreas se compararon en EPSG:3116 y la localidad principal se asignó por la mayor intersección. La salida UPZ está en GeoJSON WGS84 estándar.

| Archivo | Contenido |
|---|---|
| `public/data/upz-localidades.geojson` | 112 polígonos con código y nombre de localidad, porcentaje de pertenencia, cobertura y localidades secundarias. |
| `public/data/upz-localidades.csv` | Una fila por UPZ con la localidad principal, cobertura y excepciones. |
| `scripts/join_upz_localities.py` | Conversor y cruce espacial reproducible. |

De las 112 UPZ, **105** quedan cubiertas por una sola localidad; **2** tienen una localidad dominante con un solape pequeño; **2** se superponen de forma más sustantiva y **3** tienen cobertura parcial en la capa de localidades. Hay UPZ en **19 localidades**; la capa no contiene UPZ de Sumapaz.

| UPZ | Asignación por mayor área | Observación |
|---|---|---|
| Quiroga (39) | Rafael Uribe Uribe, 99,98% | 0,023% intersecta Tunjuelito. |
| Las Cruces (95) | Santa Fe, 99,20% | 0,80% intersecta San Cristóbal. |
| San Isidro–Patios (89) | Chapinero, 93,26% | 6,74% intersecta Usaquén. |
| Parque Entrenubes (60) | Usme, 91,16% | 8,84% intersecta Rafael Uribe Uribe. |
| Las Margaritas (83) | Kennedy | 99,445% cubierto por la capa de localidades. |
| Patio Bonito (82) | Kennedy | 99,791% cubierto por la capa de localidades. |
| Calandaima (79) | Kennedy | 99,843% cubierto por la capa de localidades. |

Las porciones sin cobertura en las tres últimas UPZ se dejaron marcadas, no se asignaron por inferencia. Las intersecciones inferiores al 0,01% se tratan como posible ruido de borde; los porcentajes y las intersecciones relevantes permanecen en los archivos para revisión.

## Búsqueda del mapa y Sitios de interés

El buscador permite encontrar puestos de votación y puntos aprobados, centrar el mapa en ellos y —cuando se configura Geoapify— buscar direcciones/lugares externos dentro del área de Bogotá. La búsqueda externa sólo ocurre al enviar el formulario (sin autocompletado) y avisa que el texto consultado se envía al proveedor. La capa de Sitios de interés es independiente de las capas electorales. En móviles, su panel se puede plegar para dejar visible el mapa.

El botón **Proponer punto de interés** activa la selección con un clic y permite enviar nombre, tipo, descripción, dirección/referencia, nota de fuente y coordenadas, sin crear una cuenta. La propuesta no se muestra públicamente hasta que la cuenta editorial única la aprueba; el editor también puede rechazarla. El proyecto Supabase DCP tiene aplicada la migración `20261003_interest_sites`: RLS permite al público leer sólo puntos aprobados y enviar propuestas, pero no consultar la cola ni escribir en el directorio; las acciones de moderación usan funciones RPC verificadas. La lectura pública real respondió HTTP 200 después del despliegue; el directorio aprobado está vacío por ahora.

La búsqueda local y la propuesta manual funcionan sin clave externa. Para direcciones/lugares se integró Geoapify como opción de $0 (la página de precios consultada publica 3.000 créditos diarios y 5 solicitudes/segundo en Free); requiere `NEXT_PUBLIC_GEOAPIFY_API_KEY`, atribución y restricción de origen. No se usa el servidor público Nominatim para autocompletar por sus condiciones. El estado del secret opcional de Geoapify no se pudo comprobar: la API de GitHub rechazó el listado de secrets con HTTP 403; no se leyó ni expuso ningún valor.

## Hub “Datos sobre el Concejo de Bogotá”

La tarjeta 01 fue reemplazada por **Datos sobre el Concejo de Bogotá**, con la descripción solicitada. La página `/concejo/` incluye regreso al inicio, enlace al mapa con la elección Concejo 2023–2027 seleccionada y áreas para tendencias, bancadas, proposiciones y proyectos de acuerdo. Sólo la tendencia electoral está disponible hoy; el resto aparece como “En preparación” hasta incorporar fuentes verificables.

## Hub “Personajes importantes”

Se implementó la interfaz de flashcards con nombre, fotografía opcional, contacto, Facebook, Instagram, X, tipo de personaje y edición. La página ofrece volver al inicio, proponer un personaje sin cuenta y acceso editorial. Las propuestas incluyen nota/fuente privada, no se publican antes de aprobación y el editor puede rechazarlas. No se permiten fotos anónimas; el editor puede subir una foto después de aprobar, limitada a JPG/PNG/WebP de hasta 5 MB. Los modales tienen gestión de foco/teclado y etiquetas ARIA.

La integración está aplicada en el proyecto Supabase DCP, cuyo plan de organización se confirmó como **Free**. `anon` sólo puede insertar campos limitados en `character_submissions`; no puede leer, cambiar, borrar ni aprobar. La única fila de `private.character_editors` se asignó al único usuario Auth permanente verificado. Funciones transaccionales protegidas copian una propuesta aprobada a `characters` o la marcan rechazada; el directorio público sólo contiene fichas aprobadas. Se verificaron RLS, permisos de columna/tabla, las funciones RPC y las migraciones. El honeypot es una barrera básica, no un rate limit. La usuaria confirmó que el registro público de Auth ya está desactivado.

## Validación y publicación

`NEXT_PUBLIC_BASE_PATH=/dcp npm run build` pasó con compilación, verificación de tipos y exportación estática de `/`, `/concejo/` y `/personajes/`. El workflow de Pages para el commit `2fc63eb` completó build y deploy. En producción se comprobaron las tres páginas, sus 31 assets de Next, el manifiesto de rutas, el JSON de Cámara (1.082 puestos/15 partidos) y la API pública Supabase `interest_sites`; todo respondió HTTP 200. El directorio publicado aún tiene 0 puntos. La migración de Sitios de interés y su prueba SQL pasan análisis sintáctico; el plan pgTAP contiene 31 aserciones. `supabase test db` no se ejecutó porque aquí no están instalados CLI/Docker. Las advertencias del asesor de seguridad preexistentes sobre RPC `SECURITY DEFINER` y protección contra contraseñas filtradas siguen registradas. El workflow también mostró avisos no bloqueantes de obsolescencia de Node 20 en algunas Actions y futura migración de `ubuntu-latest`. El cruce espacial de UPZ sigue validado: 112 códigos únicos, 112 filas CSV y 112 geometrías válidas.

La auditoría `npm audit` reportó **2 avisos en dependencias existentes**: uno crítico en Next.js y uno alto en PostCSS. La última versión publicada de Next 14 sigue siendo 14.2.35; npm propone Next.js 16.3.8 como corrección automática, un cambio de versión mayor que requiere pruebas separadas. Este proyecto usa `output: "export"` y publica sólo HTML/CSS/JS estáticos, sin servidor Next.js ni API de optimización de imágenes en ejecución; los avisos asociados a esos endpoints no están expuestos en el sitio de Pages. Aun así, la dependencia no está actualizada y deberá revisarse antes de migrar a un despliegue con servidor.

La versión actual está publicada en <https://teez-21.github.io/dcp/>; los hubs están en <https://teez-21.github.io/dcp/personajes/> y <https://teez-21.github.io/dcp/concejo/>. El deploy del release está en <https://github.com/TeeZ-21/dcp/actions/runs/37161739481>. Las dos variables obligatorias de Supabase fueron validadas por el workflow y la usuaria ya había confirmado su configuración. El listado de secrets continúa restringido por HTTP 403, por lo que no se verifican valores ni el estado del secret opcional de Geoapify. El directorio de Sitios de interés está vacío; las propuestas nuevas quedan pendientes de moderación en la base real.

## Siguientes pasos

1. Probar desde la web el envío anónimo y la aprobación/rechazo de una propuesta de sitio; para personajes, completar también la prueba de foto editorial.
2. Si se desea búsqueda genérica de direcciones, configurar el secret opcional `NEXT_PUBLIC_GEOAPIFY_API_KEY` con una clave Geoapify gratuita restringida al origen del sitio; los puestos y puntos aprobados ya se buscan localmente.
3. Añadir al Hub del Concejo las fuentes verificables necesarias para completar bancadas, proposiciones y proyectos de acuerdo.
4. Ejecutar `supabase test db` con CLI/Docker en un entorno adecuado y habilitar protección contra contraseñas filtradas si está disponible en el plan Free.
5. Planear la actualización mayor de Next.js antes de migrar a un hosting con servidor; para Pages se publica una exportación estática.
