# Norvik Control Center

Aplicación web local para organizar toda la tienda de dropshipping **Norvik**
(moda femenina, proveedor Trendsi, `norviik.myshopify.com`).

Todo corre en tu ordenador. No hay login, no hay servicios externos y los datos
viven en un único archivo SQLite dentro del proyecto.

## Arrancarla en Windows (la forma fácil)

Haz doble clic en **`Abrir Norvik.bat`**. La primera vez instala todo solo y
tarda unos minutos; después arranca en segundos y abre el navegador.

Requisito único: tener [Node.js](https://nodejs.org) instalado (versión LTS).
Si no lo tienes, el propio lanzador te lo dirá.

Para cerrar la app, cierra la ventana negra.

Para traerte la última versión del código, doble clic en
**`Actualizar Norvik.bat`** con la app cerrada. Descarga y reemplaza los
archivos sin tocar `prisma/dev.db`, así que no pierdes tareas ni pedidos.

## Arrancarla a mano

Desde esta carpeta (`norvik-control-center`):

```bash
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Después abre <http://localhost:3000>.

Qué hace cada comando:

1. `npm install` instala las dependencias y genera el cliente de Prisma.
2. `npx prisma migrate dev --name init` crea la base de datos `prisma/dev.db`.
3. `npx prisma db seed` carga el checklist maestro completo (25 tareas), la
   rutina diaria y los 6 productos con stock 0. Es idempotente: si ya hay
   datos no duplica nada.
4. `npm run dev` levanta la aplicación.

A partir de la primera vez basta con `npm run dev`.

## Módulos

- **Panel** — progreso global, semáforo por área (Catálogo, Legal, Pagos,
  Marketing, Operaciones), alertas, tareas de hoy y el bloque
  «¿Qué hago ahora?», que siempre muestra la siguiente tarea más prioritaria
  con sus pasos.
- **Checklist** — el checklist maestro completo. Cada tarea tiene descripción,
  pasos numerados tipo tutorial, prioridad P1-P4, área, estado, fecha límite y
  notas. Se pueden añadir, editar, reordenar y filtrar.
- **Catálogo** — tabla de productos con coste, precio, margen calculado, stock,
  estado y enlaces a Trendsi y Shopify; avisos de margen bajo, stock 0, falta de
  guía de tallas o de reseñas; y calculadora de precios con redondeo a `,99`.
- **Pedidos** — registro manual con el flujo pagado → comprado en Trendsi →
  enviado → tracking enviado → entregado, más el checklist diario de
  operaciones.
- **Marketing** — calendario de contenidos de Instagram y TikTok, registro de
  campañas con ROAS calculado y lista de códigos de descuento.
- **Finanzas** — gastos, ingresos derivados de los pedidos y resumen mensual con
  el beneficio neto.
- **Ajustes** — moneda, margen objetivo y exportación.

## Copias de seguridad

En **Ajustes** hay un botón para descargar toda la base en JSON y otro por cada
tabla en CSV (separador `;`, listo para Excel en español).

También puedes copiar directamente el archivo `prisma/dev.db`.

## Otros comandos

| Comando | Para qué sirve |
| --- | --- |
| `npm run db:seed` | Vuelve a ejecutar el seed (no duplica lo que ya existe). |
| `npm run db:studio` | Abre Prisma Studio para ver y editar las tablas a mano. |
| `npm run build` | Compila la versión de producción. |
| `npm run lint` | Pasa el linter. |

## Empezar de cero

Borra `prisma/dev.db` y vuelve a ejecutar `npx prisma migrate dev`.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 7 · SQLite.
