# Avance del proyecto — Datos a tener en cuenta

**Corte:** 2 de octubre de 2026. **Estado:** código y datos en revisión; sin publicación permanente.

## Resumen

Se conservaron los cambios visuales solicitados, se reemplazó la base de Alcaldía por el MMV adjunto y se generó una capa de UPZ enriquecida con la localidad de mayor intersección. El cruce y la tabla están listos en el proyecto, pero todavía no están conectados al mapa.

## Interfaz

| Estado | Trabajo |
|---|---|
| Hecho | Se restauraron los estilos globales y el diseño oscuro editorial; el acento es morado `#c4b5fd`. Se retiró la frase final. **Bitácora** se convirtió en **Sugerencias**, con temas y entradas persistentes. |
| Pendiente | Retirar el cargador manual de GeoJSON y conectar capas precargadas de localidades/UPZ con un selector. La interfaz actual todavía muestra «Subir GeoJSON de localidades». |

## Base de Alcaldía

`src/data/alcaldia-2023.json` se generó a partir de `MMV_2023_16_BOGOTA_ALCALDE.csv`, agregando las 17.518 mesas por puesto. Incluye **957 puestos**, **20 localidades** y **9 candidatos**. El total nuevo en localidades es **2.880.530 votos de candidatos**, frente a **2.879.176** en la base anterior (**+1.354 netos**); los totales por candidatura también varían.

Se agregó el marcador `alcaldia-mmv-2023-v1` y una migración que actualiza la Alcaldía persistida en el navegador al recargar. Conserva preferencias de nombres/colores de candidatos y no reemplaza las demás elecciones. El MMV no incluye coordenadas, por lo que los puestos aparecen sin coordenadas. Para esta vista se excluyeron **26.211 votos de candidatos** que no pertenecen a las localidades 01–20 y **217.979 votos no candidatos** (blancos, nulos y no marcados), ya que el formato actual almacena votos de candidatos. El conversor está en `scripts/convert_alcaldia_mmv.py`; la copia anterior queda fuera del proyecto, en la caché privada del espacio de trabajo.

Al sincronizar también se incorporará `public/data/concejo-2023.json`, que el cargador existente del Concejo solicita por HTTP y faltaba en el repositorio. Es la copia precargada del proyecto local; no se reprocesó ni se modificó como parte de la sustitución de Alcaldía.

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

## Validación y publicación

`npm run build` pasó con compilación, tipos y páginas estáticas. El cruce pasó validaciones: 112 códigos únicos, 112 filas CSV y geometrías válidas (107 `Polygon`, 5 `MultiPolygon`). La previsualización confirmó la migración a 957 puestos sin errores de consola.

Durante `npm ci`, npm reportó **2 avisos en dependencias existentes**: uno crítico en Next.js y uno alto en PostCSS. La reparación automática propone Next.js 16.3.8, un cambio de versión mayor; no se aplicó porque requiere una actualización separada y pruebas de compatibilidad.

No se ha fusionado a `main` ni publicado el sitio. Esta actualización se subirá a una rama aparte, sin workflow de despliegue, para respetar la decisión de esperar antes de crear una URL permanente.

## Siguientes pasos

1. Recibir la tabla **puesto→UPZ** y asignar los resultados electorales a los polígonos.
2. Integrar las capas precargadas y el selector Localidad/UPZ; retirar el cargador manual.
3. Validar puestos sin correspondencia y revisar los siete casos geométricos listados.
4. Completar la revisión visual y solo entonces evaluar una publicación permanente.
