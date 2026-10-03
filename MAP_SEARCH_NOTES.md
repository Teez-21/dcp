# Búsqueda del mapa: proveedores y decisión

**Consulta:** 3 de octubre de 2026.

## Candidatos revisados

- **Nominatim público de OpenStreetMap:** su política limita el servicio a un máximo de 1 solicitud por segundo por aplicación, requiere identificar la aplicación y atribuir OpenStreetMap, prohíbe autocompletado desde el cliente y exige poder cambiar el servicio. Además, la política actual prohíbe integrar la API pública como servicio genérico de búsqueda en aplicaciones producidas por plataformas no-code/low-code/vibe-coding. Por esa restricción, no se selecciona para este sitio.
- **Geoapify Geocoding:** la página oficial publica un plan Free de **3.000 créditos/día**, hasta **5 solicitudes/segundo**, sin tarjeta de crédito; indica que puede usarse en producción si se respetan cuota, límites y atribución. Una petición sencilla de geocodificación cuesta normalmente 1 crédito. El servicio requiere una API key del proyecto del usuario.
- **IDECA/Mapas Bogotá:** se localizó el visor geográfico oficial y datasets abiertos, pero en esta revisión no se encontró una API pública de geocodificación con un contrato oficial claro para integrar una búsqueda de direcciones en esta web.

## Decisión provisional

Implementar búsqueda local dentro de los puestos de votación y Sitios de interés aprobados, más integración opcional de búsqueda externa con Geoapify, limitada a Bogotá y ejecutada sólo al enviar la búsqueda (sin autocompletado). La función externa quedará inactiva hasta que se configure `NEXT_PUBLIC_GEOAPIFY_API_KEY`; el mapa seguirá funcionando sin ella. Debe mostrarse atribución de Geoapify y los usuarios deben saber que la búsqueda externa envía el texto consultado a ese proveedor. La clave del navegador es pública por diseño: debe restringirse en Geoapify al origen `https://teez-21.github.io` y establecerse en Actions como `NEXT_PUBLIC_GEOAPIFY_API_KEY`.

## Fuentes oficiales

- OpenStreetMap Foundation, política Nominatim: <https://operations.osmfoundation.org/policies/nominatim/>
- Geoapify, tarifas: <https://www.geoapify.com/pricing/>
- Geoapify, documentación de búsqueda/geocodificación: <https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/>
- IDECA Bogotá: <https://www.ideca.gov.co/mapa/mapas-por-localidad>
