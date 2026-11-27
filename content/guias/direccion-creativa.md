# Dirección creativa de Guías FraganUS

Cada guía es un reportaje con una puesta en escena propia. Comparte con la tienda la tipografía, el lenguaje en español del Perú y una forma clara de navegar. Diseña el movimiento a partir de la pregunta que contesta el artículo. Entrega el texto como datos y la puesta en escena como un componente Astro exclusivo del artículo.

## Referencias y cómo aplicarlas

### Shopify Editions, Winter ’26 · Finance

[Ver Finance en Shopify Editions](https://www.shopify.com/editions/winter2026#finance)

La navegación lateral permite saltar a Finance sin recorrer las categorías anteriores. La sección primero presenta una escena a gran escala. Monedas, teléfono y una figura de estilo renacentista introducen el tema visualmente. Después, una demostración animada muestra cómo se solicitan fondos y se retiran. Los demás casos alternan demostraciones y fichas más breves. La escala le dice al lector dónde detenerse y las anclas le permiten buscar otra parte sin perderse.

**Traslado a FraganUS.** Abre con una acción o evidencia que defina el tema. En «Del azahar al neroli», una rama se divide en dos rutas de extracción. Cada ruta recibe una ilustración que cambia al leer su explicación. Después, una comparación breve permite identificar qué es un extracto y cómo se distingue su perfil. El texto y las fuentes acompañan a cada recorrido. Pon enlaces de salto si el lector podría llegar buscando solo una de las dos rutas.

### Bidwells · Driving Innovation at Speed

[Ver el reportaje en Bidwells](https://www.bidwells.co.uk/insights-reports-events/driving-innovation-at-speed/) · [Ver la ficha de producción de Maglr](https://www.maglr.com/inspiration/bidwells-report-driving-innovation-at-speed)

El reportaje cuenta cómo se traslada la innovación del automovilismo a otras industrias. La portada y la salida de la primera escena usan marcas de pista vistas desde arriba. Al abandonar la escena oscura aparece una superficie clara, con foto y una barra discreta que indica avance y da acceso al informe. El equipo de producción dejó que cifras y visualizaciones aparecieran con el avance de la lectura. El motivo de pista sostiene el ritmo mientras cambia la escala, de la industria a sus aplicaciones.

**Traslado a FraganUS.** Para «La vida de un perfume en la piel», conserva una misma tira olfativa mientras cambian sus anotaciones al entrar en salida, corazón y fondo. Alterna escenas breves con una pausa para explicar cómo se hizo la prueba. Si usas horas, preséntalas como observaciones de esa prueba y conserva las etiquetas a la vista. En pantallas pequeñas, coloca cada anotación junto al párrafo que le corresponde.

Las referencias sirven para estudiar escala, secuencia, navegación y relación entre texto y evidencia. Usa fotografía propia o generada para FraganUS y dibuja los SVG específicos de la guía. Trabaja con los colores y la tipografía ya instalados.

## Encargo para un modelo de redacción o diseño

1. Escribe la pregunta del lector en una línea y formula la idea que recordará al terminar. Indica qué aporta cada escena a esa respuesta.
2. Boceta tres recorridos con mecánicas distintas. Por ejemplo, una comparación por capas, una prueba en tres momentos y una secuencia de decisiones. Elige el que el material realmente puede demostrar. Compara tu elección con las tres guías publicadas para evitar que cambie solo la decoración.
3. Describe la portada y al menos dos escenas de forma que otro diseñador pueda dibujarlas. Enumera la posición del texto y del medio, qué se mantiene a la vista al desplazar, qué se transforma y qué aprende el lector de ese cambio. Distingue fotografía, SVG, tabla y texto.
4. Dibuja el flujo en escritorio, en móvil y con movimiento reducido. Si el desplazamiento acciona un gráfico, conserva visibles los datos, etiquetas y conclusión en HTML. Mantén el scroll nativo. Usa enlaces de salto, foco visible y controles utilizables con teclado. Un movimiento debiera explicar una transición o relación concreta del tema.
5. Escribe al menos **800 palabras en los párrafos del cuerpo**. Usa **800–1,200** como referencia de extensión y amplía el artículo cuando haya evidencia o ejemplos que merezcan más espacio. El validador cuenta párrafos de los capítulos. Títulos, pies, citas, listados y avances de lecturas relacionadas quedan fuera del conteo.
6. Documenta fuentes primarias y comprueba los datos antes de dibujarlos. Un ranking debe llevar canal o mercado, fecha y métrica conocida. Una estimación, un precio anunciado y una venta confirmada requieren etiquetas diferentes. Mantén los datos de un gráfico en la fuente editorial para que coincidan con el texto.
7. Cierra con algo que ayude a usar lo leído o abra la pregunta del siguiente artículo. Cuando la lectura relacionada resuelva esa pregunta, escribe qué va a encontrar el lector y enlaza la guía publicada.
8. Entrega un guion de escenas, un brief para cada recurso visual, un esquema de datos y una ruta de implementación. Incluye un croquis de la primera pantalla y de una transición importante. Los hechos por verificar deben quedar identificados en el borrador.

## Ejemplos en código

- [Atlas de orígenes](../../src/pages/guias/origen-fragancias-mas-vendidas.astro). El [mapa](../../src/components/GuideMap.astro) combina anclas de capítulos con rutas SVG que se activan conforme se recorre el texto. Úsalo como referencia cuando cambiar de lugar tenga sentido narrativo.
- [Vitrina de perfumes caros](../../src/pages/guias/perfumes-mas-caros.astro). Portada oscura con foto y texto superpuesto en escritorio, fichas de exposición con ilustraciones y navegación lateral. En móvil, la foto y la composición textual se apilan.
- [Reportaje de Perú](../../src/pages/guias/perfumes-mas-vendidos-peru.astro). Una foto panorámica abre el relato. El dato sectorial, la lista ordenada y el bloque ilustrado del cierre tienen escalas distintas. El valor del gráfico viene del artículo en D1 y se lee incluso con la animación desactivada.
- [Párrafos, imágenes y fuentes de capítulo](../../src/components/guides/ChapterText.astro) y [portadas adaptables](../../src/components/GuideImage.astro). Puedes aprovechar estas piezas en una composición completamente nueva.

Ejemplo de SVG que dibuja la relación ya descrita en el HTML al entrar a la escena. El trazo es visible sin JavaScript y se anima una vez durante la lectura.

```astro
<figure data-guide-draw>
  <figcaption>Una misma flor, dos rutas de extracción</figcaption>
  <svg viewBox="0 0 96 64" aria-hidden="true" focusable="false" fill="none" stroke="currentColor">
    <path d="M48 8v18" />
    <path d="M48 26Q48 39 17 54M48 26Q48 39 79 54" pathLength="1" data-draw-line />
  </svg>
  <ul><li>Destilación</li><li>Extracción con disolvente</li></ul>
</figure>
```

## Integración y revisión

- Guarda el contenido en `content/guias/articulos/<slug>.json`, la dirección de esta guía en `content/guias/direcciones/<slug>.json` y su puesta en escena en `src/pages/guias/<slug>.astro`. Observa cómo el script valida que los tres archivos coincidan.
- Conserva un H1, los ID de las anclas que ya se hayan publicado y una jerarquía de encabezados que siga el orden de lectura. Mide la lectura a 320 px y en un escritorio amplio, con teclado y con y sin animaciones.
- Documenta la generación o procedencia de cada imagen en `content/guias/media/provenance.json`. Prepara WebP de 640 y 1280 px para R2, con texto alternativo que describa el motivo. Cuida el recorte previsto en portada y en el índice.
- El [workflow de Guías](../../.github/workflows/guides-refresh.yml) lee esta dirección y puede preparar un briefing de un tema bajo demanda. La renovación semanal lee además la dirección individual de la guía y actualiza su entradilla y portada. El componente de una guía nueva, su contenido, verificaciones y migración siguen el proceso de publicación del repositorio.
