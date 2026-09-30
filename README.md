# Datos a tener en cuenta

Dashboard de consultoría de campaña (Concejo de Bogotá), construido con
Next.js 14, TypeScript, Tailwind CSS y componentes estilo shadcn/ui.

## Requisitos

- Node.js 18.18 o superior (probado con v22).

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre http://localhost:3000 en el navegador.

Para una compilación de producción:

```bash
npm run build
npm start
```

## Qué hay construido

- **Cabecera** con selector de tema (Tokyo Night Light / Solarized Light).
- **Pestañas** para los 7 módulos del dashboard. Solo **Mapa** está
  construido; el resto son estados vacíos con animación de entrada,
  listos para recibir contenido.
- **Módulo Mapa**: panel de control flotante (arriba a la izquierda) sobre
  un mapa Leaflet a pantalla completa que se puede arrastrar y hacer zoom
  libremente. El panel incluye:
  - Un menú desplegable para elegir qué elecciones se muestran.
  - Un selector del modo de visualización (localidad ganada, proporción,
    puestos de votación).
  - Edición de candidatos y sus colores.
  - Importación de GeoJSON de localidades, CSV de la Registraduría (por
    mesa), CSV de coordenadas de puestos, y formatos simples.
  - Exportar/importar el proyecto completo en JSON.
  - Un mini gráfico de barras (Chart.js) con el resumen de votos.
- El estado se guarda automáticamente en el navegador (localStorage) vía
  Zustand con persistencia.

## Estructura

```
src/
  app/            layout, página y estilos globales
  components/
    dashboard/    Header, NavTabs, ControlDeck, MapCanvas, MiniChart, etc.
    ui/           componentes estilo shadcn (button, select, dropdown, etc.)
  lib/
    electoral.ts  modelo de datos, normalización de localidades, parseo CSV
    utils.ts      helper cn() para clases de Tailwind
  store/
    useDashboardStore.ts   estado global (Zustand) con persistencia
```

## Notas técnicas

- El mapa base usa CARTO Voyager con una API key incluida en
  `MapCanvas.tsx` (constante `CARTO_KEY`). Si vas a compartir este
  proyecto o subirlo a un repositorio público, considera mover esa clave
  a una variable de entorno y rotarla.
- `leaflet.markercluster` se importa dinámicamente en el cliente junto
  con Leaflet, porque ambos dependen del DOM del navegador y no pueden
  cargarse en el servidor (Next.js hace renderizado en servidor por
  defecto).
- El componente de mapa fue probado con `npm run build` y `npm start`
  (compila y el servidor responde), pero no se verificó visualmente en un
  navegador real desde el entorno donde se generó este proyecto. Pruébalo
  con tus datos y avisa si algo no se ve o no importa como se espera.
