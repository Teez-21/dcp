# Puestos de votación por UPZ — Bogotá

Este conjunto de datos relaciona cada puesto de votación de Bogotá con la **UPZ** en la que se encuentra su coordenada geográfica.

## Archivo completo

- [Descargar la tabla completa en CSV](./puestos-upz.csv)

El CSV contiene un registro por puesto de votación y puede abrirse en Excel, Google Sheets, LibreOffice o cualquier herramienta de análisis de datos.

## Cobertura

- **Puestos procesados:** 1.084
- **Puestos con UPZ asignada:** 1.061
- **UPZ distintas con puestos:** 107
- **Localidades cubiertas:** 20
- **Puestos fuera de los polígonos UPZ:** 23

Los 23 puestos sin UPZ no fueron asignados de manera aproximada: sus coordenadas quedaron fuera de la capa de polígonos UPZ utilizada. En el CSV aparecen con `upz_code` y `upz_name` vacíos y `join_status = outside_upz`.

## Columnas principales

| Columna | Descripción |
|---|---|
| `station_key` | Identificador compuesto por localidad/zona y número del puesto |
| `geo_code` | Código geográfico del puesto en la fuente original |
| `locality_name` | Localidad del puesto según la fuente de puestos |
| `station_number` | Número del puesto dentro de la localidad |
| `name` | Nombre del puesto de votación |
| `site_name` | Nombre del sitio o sede |
| `address` | Dirección reportada |
| `longitude`, `latitude` | Coordenadas geográficas en EPSG:4326 |
| `upz_code` | Código de la UPZ asignada |
| `upz_name` | Nombre de la UPZ asignada |
| `join_status` | Resultado del cruce espacial |

## Valores de `join_status`

- `inside_source_locality`: el punto quedó dentro de una UPZ de la misma localidad reportada por la fuente.
- `inside_different_locality`: el punto quedó dentro de una UPZ de otra localidad, por lo que se conserva el resultado pero se marca para revisión.
- `outside_upz`: el punto no quedó dentro de ningún polígono UPZ disponible.

## Método y fuentes

La asignación se hizo mediante un cruce espacial **punto-en-polígono**: se tomó la coordenada de cada puesto y se buscó el polígono UPZ que la contiene. No se asignó una UPZ por cercanía cuando el punto no estaba dentro de un polígono.

- Puestos de votación: [Datos Abiertos Bogotá — Puesto de votación](https://datosabiertos.bogota.gov.co/dataset/d03ad429-75f7-4307-9521-da7442154289/resource/acc0e326-b82c-46f7-8af6-9a46f2ff79de)
- Capa de UPZ/localidades utilizada por el proyecto: `upz-localidades.geojson`
- Script reproducible del cruce: [`join_polling_stations_upz.py`](../../scripts/join_polling_stations_upz.py)

La tabla debe interpretarse como una asignación geográfica basada en las coordenadas disponibles. Los casos marcados como `outside_upz` o `inside_different_locality` conviene revisarlos antes de usarlos para decisiones operativas de alta precisión.
