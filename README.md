# FraganUS

Tienda en español para Perú, enfocada en perfumes árabes. Los productos del catálogo de muestra tienen precios de hasta S/ 160. El catálogo se puede filtrar por clima y ocasión. El código usa Astro, TypeScript y Tailwind CSS con Cloudflare Workers, D1 y R2 privado. El adaptador vigente de Astro despliega SSR en Workers. [Documentación de Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/)

La [vista previa en Cloudflare](https://fraganus.juarpla.workers.dev/) usa el catálogo de muestra y tiene los cobros desactivados. D1 y R2 ya están vinculados al Worker.

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

En `/admin` aparecen las solicitudes por confirmar. Consulta la cobertura y el flete con Shalom para la ciudad y agencia indicadas. Registra el importe confirmado y pulsa **Confirmar cobertura, flete y stock**. La confirmación reserva las unidades y habilita el pago. En **En espera de pago**, usa **Enviar confirmación por WhatsApp** para compartir el enlace. Una vez recibido el comprobante, revisa el abono de Yape o Plin en **Pendiente de verificación** y pulsa **Aprobar pago**. Si cancelas una solicitud ya confirmada antes de aprobar el pago, sus unidades vuelven al stock disponible. El enlace **Stock** lleva a las unidades registradas por producto en D1, con su estado de disponibilidad. **Bolsas pendientes** muestra los carritos de quienes autorizaron el contacto por WhatsApp.

## Activar la tienda

1. Vincula D1 y un bucket R2 privado en `wrangler.toml`. Para una base nueva, crea primero las tablas con `npx wrangler d1 execute fraganus-db --remote --file=./schema.sql`. En una base nueva o existente, aplica `npx wrangler d1 migrations apply fraganus-db --remote` antes de desplegar esta versión. Carga tu catálogo con fotos, precios, stock y etiquetas. `seed.sql` contiene datos de muestra para el entorno local.
2. Sube `public/qr-yape-plin.webp` con tu QR real y añade `PAYMENT_QR_ENABLED = "true"` en las variables de Cloudflare para mostrarlo. Usa `npx wrangler secret put NOMBRE` para configurar `PAYMENT_PHONE` con nueve dígitos, `PAYMENT_RECIPIENT` con el nombre del titular, `ADMIN_USER` y `ADMIN_PASSWORD` con credenciales propias. Para las alertas, configura `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` de un chat privado.
3. Cambia `STOREFRONT_PREVIEW` a `"false"` o retírala de `wrangler.toml`. Ejecuta `npm run deploy`. Cuando tengas `fragan.us` en tu cuenta de Cloudflare, vincúlalo como dominio personalizado del Worker.
4. Desde un celular, valida el flujo con el número y el QR reales. En `/admin` verifica el ingreso y aprueba el pago. Comprueba el stock y el estado usando el código de pedido.

El cliente solicita el pedido con envío nacional exclusivo por Shalom. El estado del pedido habilita el pago por Yape o Plin después de la confirmación. El flete se paga a Shalom por separado. Las bolsas pendientes se guardan cuando la persona autoriza el contacto por WhatsApp. El pedido histórico con comprobante deduce el stock al aprobarse. Los pedidos nuevos lo reservan al confirmar la cobertura y el flete.

## Imágenes de la demostración

La portada utiliza las referencias de [Odyssey Mandarin Sky](https://promart.vteximg.com.br/arquivos/ids/11128441-1000-1000/image-0.jpg?v=639198402728170000), [Khamrah](https://p16-oec-general-useast5.ttcdn-us.com/tos-useast5-i-omjb5zjo8w-tx/12bf49e93d2d48719c30c4aab0b51a43~tplv-fhlh96nyum-crop-webp:400:400.webp?dr=12190&t=555f072d&ps=933b5bde&shp=57fff0e0&shcp=0d52deaf&idc=useast8&from=1476391136) y [Hawas for Him](https://media.falabella.com/falabellaPE/135506601_01/w=1500,h=1500,fit=cover) proporcionadas para FraganUS. Las fotos de referencia de los productos proceden de [Zamoori](https://zamoori.co.uk/collections/lattafa-perfumes), [Arabic Perfumes](https://arabicperfumes.com/fr/femmes/lattafa-yara), [Fragrance Outlet](https://www.fragranceoutlet.com/) y [BeautyHouse](https://beautyhouse.com/products/lattafa-qaed-al-fursan-eau-de-parfum-for-everyone). Las notas siguen las fichas de Lattafa. [Khamrah](https://lattafa.com/product/khamrah/), [Yara](https://lattafa.com/product/yara/), [Asad](https://lattafa.com/product/asad/), [Qaed Al Fursan](https://lattafa.com/product/qaed-al-fursan/)
