# Dirección visual — Datos a tener en cuenta

## Referencia elegida

**Referencia ground truth:** [legendxdevil/nexus-studio](https://github.com/legendxdevil/nexus-studio), template de 21st.dev.

La referencia define la dirección de esta iteración: estética **dark luxury editorial**, tipografía display de gran escala, fondo casi negro, acento morado eléctrico, grilla fina, bloques tipo bento, navegación fija minimalista y reveals al hacer scroll. No se replica contenido ni identidad de Nexus; se adapta su lenguaje visual a la herramienta existente.

## Dirección comprometida: Nexus Editorial Scroll

### Movimiento de diseño
Una experiencia narrativa de una sola página. La interfaz deja de comportarse como un dashboard dividido en pestañas y se convierte en un recorrido continuo: hero cinematográfico, señales, territorio, sistema de módulos y cierre. El mapa y las herramientas existentes siguen siendo funcionales, pero aparecen dentro de una historia visual única.

### Principios centrales
- Una página, una narrativa, cero selector de pestañas.
- La navegación superior muestra únicamente iconos; cada icono hace scroll suave a su sección.
- Cada sección debe sentirse como una escena distinta, no como una pantalla administrativa.
- La información aparece por capas mediante reveals, escalas, desplazamientos y estados de hover.
- La funcionalidad de datos se conserva; la presentación se vuelve editorial, inmersiva y exploratoria.

### Filosofía de color
Base casi negra `#04040a`, superficies ink azul-violeta y un único acento de alta energía `#c4b5fd`. Violetas, naranjas y cian aparecen como acentos secundarios en tarjetas y módulos. El mapa se integra con una lectura nocturna y paneles translúcidos.

### Paradigma de layout
- **Hero:** pantalla completa, grilla fina, orb de luz, titular gigante y CTAs.
- **Señales:** métricas y tarjetas bento que convierten el estado del proyecto en una lectura visual.
- **Territorio:** mapa grande dentro de una escena dedicada, con ControlDeck superpuesto.
- **Sistema:** seis módulos en una grilla responsive, todos en el mismo flujo.
- **Sugerencias/cierre:** CTA final, identidad y retorno al territorio.
- **Navegación:** barra fija superior con marca abstracta e iconos con tooltip.
- **Regreso:** botón circular con flecha fijo en la esquina inferior mientras el usuario ha avanzado en el scroll.

### Elementos de firma
- Barra de progreso morada en el borde superior.
- Marca abstracta de tres barras en la navegación.
- Titulares display masivos y tratamiento de texto destacado.
- Marquee horizontal con palabras clave y separadores geométricos.
- Tarjetas bento con elevación, glow de borde y CTA que aparece en hover.
- Malla de constelación interactiva como textura ambiental.
- Botón circular de volver al inicio visible solo después de avanzar.

### Filosofía de interacción
Los iconos de la navegación tienen `aria-label`, tooltip y estados de foco visibles. Todos los saltos de sección usan `scrollIntoView({ behavior: "smooth" })`. El scroll revela contenido con `whileInView`; las tarjetas se elevan y cambian de borde al pasar el cursor. La navegación no bloquea la exploración del mapa ni la carga de datos.

### Animación
Framer Motion para hero word-by-word, reveals escalonados, parallax de hero, barra de progreso con spring y botón de regreso. CSS para marquee, orbes flotantes, ondas de señal y hover states. Canvas para la constelación de fondo. `prefers-reduced-motion` reduce o apaga el movimiento continuo y conserva la legibilidad.

### Sistema tipográfico
Clash Display para titulares grandes, Cabinet Grotesk para lectura y JetBrains Mono para índices, etiquetas y metadatos técnicos. El contraste tipográfico es intencional: titulares de hasta `clamp(4rem, 12vw, 11rem)`, texto de apoyo contenido y etiquetas en mayúsculas.

### Esencia de marca
Convertir señales dispersas en una experiencia de exploración clara, memorable y accionable.

### Voz de marca
Precisa, directa y contemporánea. Menos “panel de control”, más “sistema para mirar mejor”. La interfaz invita a explorar sin prometer certezas que los datos no sostienen.

### Wordmark / logo
Conservar «Datos a tener en cuenta» como nombre y usar una marca abstracta de tres barras inspirada en una señal ascendente. No añadir logos de Nexus ni copiar su contenido.

### Color de marca distintivo
Morado eléctrico `#c4b5fd` sobre negro ink `#04040a`.
