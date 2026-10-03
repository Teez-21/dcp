# Avance del proyecto — Datos a tener en cuenta

**Corte:** 3 de octubre de 2026. **Estado vigente:** el dashboard y el Hub de personajes están publicados en GitHub Pages. El proyecto Supabase DCP está activo en plan Free; el esquema está aplicado, hay una sola cuenta editorial y la usuaria confirmó que desactivó el registro público de Auth y configuró los dos secrets de Actions.

## Resumen

Se conservaron los cambios visuales solicitados, se reemplazó la base de Alcaldía por el MMV adjunto y se integraron los niveles Localidad/UPZ/Puesto en el mapa. La versión base está publicada en <https://teez-21.github.io/dcp/>. El Hub `/personajes/` ya está publicado y conectado a Supabase Free.

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

## Hub “Personajes importantes”

Se implementó la interfaz de flashcards con nombre, fotografía opcional, contacto, Facebook, Instagram, X, tipo de personaje y edición. La página ofrece volver al inicio, proponer un personaje sin cuenta y acceso editorial. Las propuestas incluyen nota/fuente privada, no se publican antes de aprobación y el editor puede rechazarlas. No se permiten fotos anónimas; el editor puede subir una foto después de aprobar, limitada a JPG/PNG/WebP de hasta 5 MB. Los modales tienen gestión de foco/teclado y etiquetas ARIA.

La integración está aplicada en el proyecto Supabase DCP, cuyo plan de organización se confirmó como **Free**. `anon` sólo puede insertar campos limitados en `character_submissions`; no puede leer, cambiar, borrar ni aprobar. La única fila de `private.character_editors` se asignó al único usuario Auth permanente verificado. Funciones transaccionales protegidas copian una propuesta aprobada a `characters` o la marcan rechazada; el directorio público sólo contiene fichas aprobadas. Se verificaron RLS, permisos de columna/tabla, las funciones RPC y las migraciones. El honeypot es una barrera básica, no un rate limit. La usuaria confirmó que el registro público de Auth ya está desactivado.

## Validación y publicación

`NEXT_PUBLIC_BASE_PATH=/dcp npm run build` pasó con compilación, verificación de tipos y exportación de `/` y `/personajes/`; el workflow de Pages para el commit `8ea0553` terminó correctamente. En producción, `/dcp/personajes/`, ocho assets muestreados y la API pública de Supabase respondieron HTTP 200; la tabla está vacía, como se esperaba. El validador de claves superó siete casos. El esquema y las pruebas pgTAP pasan el análisis sintáctico; el plan actualizado de propuestas tiene 34 aserciones, pero `supabase test db` no se ejecutó porque aquí no están instalados CLI/Docker. El asesor de seguridad dejó dos avisos intencionales sobre RPC `SECURITY DEFINER` con comprobación editorial y `search_path` vacío, más un aviso de protección contra contraseñas filtradas desactivada; no reporta ahora tablas con RLS sin política. El workflow mostró avisos no bloqueantes de obsolescencia de Node 20 en Actions y futura migración de `ubuntu-latest`. El cruce espacial previo sigue validado: 112 códigos únicos, 112 filas CSV y 112 geometrías válidas.

La auditoría `npm audit` reportó **2 avisos en dependencias existentes**: uno crítico en Next.js y uno alto en PostCSS. La última versión publicada de Next 14 sigue siendo 14.2.35; npm propone Next.js 16.3.8 como corrección automática, un cambio de versión mayor que requiere pruebas separadas. Este proyecto usa `output: "export"` y publica sólo HTML/CSS/JS estáticos, sin servidor Next.js ni API de optimización de imágenes en ejecución; los avisos asociados a esos endpoints no están expuestos en el sitio de Pages. Aun así, la dependencia no está actualizada y deberá revisarse antes de migrar a un despliegue con servidor.

El Hub está publicado en <https://teez-21.github.io/dcp/personajes/> desde el commit `8ea0553`; la ejecución de Pages está en <https://github.com/TeeZ-21/dcp/actions/runs/37133861732>. El intento de leer los secrets del repositorio respondió **HTTP 403** (`Resource not accessible by integration`), por lo que no se verificaron sus valores ni se intentó eludir ese permiso; la usuaria confirmó que los configuró desde GitHub. También confirmó que desactivó `Allow new users to sign up` en Supabase Auth. La vista previa temporal y el sitio publicado están conectados al backend DCP. El directorio aprobado está vacío; toda propuesta enviada desde la web queda en la base real, pendiente de moderación.

## Siguientes pasos

1. Probar el flujo real de envío anónimo, moderación editorial, aprobación/rechazo y carga de foto.
2. Ejecutar `supabase test db` con CLI/Docker en un entorno adecuado y habilitar protección contra contraseñas filtradas si está disponible en el plan Free.
3. Planear la actualización mayor de Next.js antes de migrar a un hosting con servidor; para Pages se publica una exportación estática.
