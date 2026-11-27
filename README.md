# FraganUS

Tienda en español para Perú, enfocada en perfumes árabes. Los productos del catálogo de muestra tienen precios de hasta S/ 160. El catálogo se puede filtrar por clima y ocasión. El código usa Astro, TypeScript y Tailwind CSS con Cloudflare Workers, D1 y R2 privado. El adaptador vigente de Astro despliega SSR en Workers. [Documentación de Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/)

La [tienda en Cloudflare](https://fragan-us.juarpla.workers.dev/) usa el inventario activo de D1. R2 guarda fotos, comprobantes y el QR de pago.

## Vista local

Requiere Node.js 22.12 o superior.

```sh
npm ci
cp .dev.vars.example .dev.vars
npm run db:local
npm run db:seed
npm run dev
```

Abre `http://127.0.0.1:4321`. En el checkout local usa datos ficticios y una imagen JPG, PNG o WebP de hasta 8 MB. Las credenciales de prueba de `/admin` están en `.dev.vars.example`. El modo de prueba guarda comprobantes y pedidos en emuladores locales y omite Telegram. `npm run check` valida los tipos y `npm run build` produce el Worker con sus archivos estáticos.

## Administración

En [/admin](https://fragan-us.juarpla.workers.dev/admin), **Catálogo y stock** permite crear perfumes con su foto, registrar unidades y decidir si se muestran en la tienda. Cada perfume admite una fragancia de referencia y una foto opcional. En **QR de pago**, sube la imagen oficial de Yape o Plin. La tienda la muestra en el paso de pago.

El comprador elige una agencia y continúa al pago. Durante 15 minutos, el pedido reserva las unidades disponibles. Al adjuntar el comprobante, pasa a **Por confirmar**. Comprueba el abono en Yape o Plin y pulsa **Confirmar pago**. El pedido pasa directamente a **En preparación**. Una vez que el transportista reciba el paquete, abre **Registrar envío**, adjunta su comprobante, escribe la clave de recojo y pulsa **Marcar como enviado**. Cinco días hábiles después, contando de lunes a viernes en hora de Perú, el panel lo mueve a **Solicitudes anteriores**. El comprador puede consultar el estado con su enlace. El transportista fija y cobra el flete por separado.

Si la reserva vence, las unidades vuelven al catálogo. Si el comprador ya pagó, puede adjuntar su comprobante desde el enlace del pedido. Antes de aprobar ese pago, revisa la disponibilidad de los perfumes. **Bolsas pendientes** muestra las bolsas de las personas que optaron por recibir recordatorios y ofertas por WhatsApp.

## Configurar la tienda

1. Vincula D1 y un bucket R2 privado en `wrangler.toml`. En una base nueva, aplica `schema.sql` antes de las migraciones. En una base nueva o existente, ejecuta `npx wrangler d1 migrations apply fraganus-db --remote` antes de desplegar.
2. Configura `PAYMENT_PHONE` (celular peruano de nueve dígitos), `ADMIN_USER` y `ADMIN_PASSWORD` como secretos del Worker cada uno con `npx wrangler secret put NOMBRE`. Si usas las alertas de Telegram, configura `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` para un chat privado.
3. Ejecuta `npm run deploy`. Carga tus perfumes y tu QR oficial desde el panel. `seed.sql` contiene datos para el entorno local.

## Agencias de recojo

[GitHub Actions](https://github.com/Juarpla/fragan-us/actions/workflows/shalom-agencies.yml) consulta cada tres días el [buscador público de Shalom](https://shalom.com.pe/agencias). Guarda las agencias habilitadas para recibir encomiendas y publica el JSON que consume la tienda. Si la consulta falla o devuelve un listado incompleto, conserva el último listado validado. También se puede ejecutar manualmente desde Actions.

La selección usa los códigos de distrito del INEI. La ubicación del comprador es opcional y solo se usa en su navegador. Si no hay agencia en el distrito, la tienda muestra agencias cercanas fuera de ese distrito. [Listado de ubigeos del INEI](https://www.datosabiertos.gob.pe/dataset/c%C3%B3digo-de-ubicaci%C3%B3n-geogr%C3%A1fica-en-el-per%C3%BA-instituto-nacional-de-estad%C3%ADstica-e-inform%C3%A1tica) · [Códigos y nombres](https://github.com/Rodasluis/Peru-maps/blob/f2553240055092daa16ace1eb4ba614d09f1ca56/salida/ubigeos_2026.csv) · [Coordenadas referenciales de capitales distritales](https://github.com/jmcastagnetto/ubigeo-peru-aumentado/blob/a783fa66effb16fa8f3321b49a3d5e71cab15a5c/ubigeo_distrito.csv)

## Imágenes de la demostración

La portada utiliza las referencias de [Odyssey Mandarin Sky](https://promart.vteximg.com.br/arquivos/ids/11128441-1000-1000/image-0.jpg?v=639198402728170000), [Khamrah](https://p16-oec-general-useast5.ttcdn-us.com/tos-useast5-i-omjb5zjo8w-tx/12bf49e93d2d48719c30c4aab0b51a43~tplv-fhlh96nyum-crop-webp:400:400.webp?dr=12190&t=555f072d&ps=933b5bde&shp=57fff0e0&shcp=0d52deaf&idc=useast8&from=1476391136) y [Hawas for Him](https://media.falabella.com/falabellaPE/135506601_01/w=1500,h=1500,fit=cover) proporcionadas para FraganUS. Las fotos de referencia de los productos proceden de [Zamoori](https://zamoori.co.uk/collections/lattafa-perfumes), [Arabic Perfumes](https://arabicperfumes.com/fr/femmes/lattafa-yara), [Fragrance Outlet](https://www.fragranceoutlet.com/) y [BeautyHouse](https://beautyhouse.com/products/lattafa-qaed-al-fursan-eau-de-parfum-for-everyone). Las notas siguen las fichas de Lattafa. [Khamrah](https://lattafa.com/product/khamrah/), [Yara](https://lattafa.com/product/yara/), [Asad](https://lattafa.com/product/asad/), [Qaed Al Fursan](https://lattafa.com/product/qaed-al-fursan/)

### Telegram y fichas de perfumes

El Worker envía una alerta de Telegram cuando guarda una nueva orden real, con el medio de pago disponible en ese momento («Yape o Plin») y un enlace directo al pedido en Administración. La alerta se envía en segundo plano. Configura `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` como secretos de Cloudflare. El chat debe ser privado y el bot debe tener permiso para escribir.

En Catálogo y stock, el alta requiere nombre, marca y precio. Dejar el stock vacío asigna 2 unidades, y escribir 0 guarda el perfume agotado. Puedes guardar los detalles y la fotografía cuando tengas los datos.

El workflow **Completar fichas de perfumes** corre cada seis horas. También se puede ejecutar desde Actions con vista previa activada para revisar los campos encontrados sin modificar el catálogo. La automatización compara nombre, marca y los datos de la versión con las fichas oficiales de Lattafa, Armaf, Rasasi y Afnan. Solo completa campos vacíos con una coincidencia única y deja pendientes los datos que no puede verificar. Las recomendaciones de clima y ocasión se derivan de la familia olfativa.

Para habilitar el workflow, registra la misma clave aleatoria de al menos 32 caracteres como secreto `CATALOG_ENRICHMENT_TOKEN` tanto en GitHub Actions como en el Worker. La clave tiene acceso únicamente a consultar y completar fichas incompletas.

## Renovación de Guías

El workflow **Renovar una guía con Agnes** se programa los domingos a las 7 p. m. de Lima. Rota entre las guías publicadas y genera una entradilla y una portada con Agnes. D1 conserva cada revisión y R2 guarda la portada en WebP de 640 y 1280 píxeles. Los capítulos, las cifras y las fuentes se editan en el contenido base.

Configura `AGNES_API_KEY` como secreto de GitHub Actions y la misma clave de al menos 32 caracteres como `GUIDES_AUTOMATION_TOKEN` en GitHub Actions y en el Worker. La ejecución manual ofrece una vista previa que genera los materiales sin escribirlos en la tienda. El [plan editorial](content/guias/plan-editorial.md) enumera las 20 guías.
