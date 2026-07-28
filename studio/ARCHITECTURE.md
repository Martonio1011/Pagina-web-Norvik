# Arquitectura

Decisiones tomadas, y por qué. Cuando una decisión tenga un coste, está escrito
aquí junto al beneficio.

---

## 1. Principio rector: el dominio no toca nada

```
src/domain/     lógica pura — sin red, sin base de datos, sin React
src/ingest/     todo lo que habla con el exterior
src/server/     lectura de la base de datos para las pantallas
src/app/        interfaz (Next.js App Router)
config/         reglas de negocio versionadas, en YAML
```

`src/domain/` no importa nada de `src/ingest/`, `src/db/` ni `src/app/`. Recibe
datos planos y devuelve datos planos. Esa es la razón de que los 66 tests
corran en menos de un segundo sin arrancar servidor ni base de datos, y de que
el cálculo de un margen se pueda comprobar leyendo veinte líneas.

Los módulos del dominio hoy:

| Módulo | Responsabilidad |
| --- | --- |
| `money.ts` | Parseo, formato y redondeo de dinero |
| `sections.ts` | Validación de `sections.yaml` y clasificación de productos |
| `economics.ts` | Coste real, PVP sugerido, margen bruto y neto |
| `matching.ts` | Emparejar mi catálogo con el de Trendsi |
| `audit.ts` | Qué está mal en el catálogo que ya tengo |
| `types.ts` | Los valores permitidos de cada columna de estado |

---

## 2. El dinero es entero, en céntimos

Ninguna cantidad se guarda ni se calcula como decimal. Todas las columnas
monetarias terminan en `Cents` y son enteros.

En coma flotante binaria, `0.1 + 0.2` no es `0.3`, y un coste de `$22.57`
acaba produciendo un margen del `64.99999999999999%`. Peor aún: dos pantallas
que hacen el mismo cálculo en distinto orden muestran números distintos. En
céntimos, `22.57` es `2257` y siempre lo será.

Los dólares solo existen en dos sitios: al leer el precio de una página de
proveedor (`parseMoneyToCents`) y al pintarlo en pantalla (`formatCents`).

---

## 3. Drizzle ORM sobre SQLite, no Prisma

El documento de partida proponía Prisma. Se ha cambiado a Drizzle, y conviene
que la razón esté escrita entera porque son dos razones, no una.

**La razón de fondo.** Prisma necesita descargar binarios nativos (los *engines*)
desde `binaries.prisma.sh` durante la instalación y en cada `prisma generate`.
Eso convierte un `npm install` en algo que depende de un servidor ajeno
accesible. Drizzle es TypeScript puro: no descarga nada, no genera nada en
tiempo de instalación, y el esquema es un archivo `.ts` normal que participa del
mismo `tsc --noEmit` que el resto del proyecto.

**La razón inmediata, y es honesto decirla.** El entorno donde se construyó esta
fase no tiene acceso de red a `binaries.prisma.sh`. Con Prisma no habría sido
posible ni generar el cliente ni aplicar una migración, y por tanto tampoco
ejecutar la aplicación ni un solo test contra ella. Entregar código que no se ha
podido ejecutar era la peor de las opciones disponibles.

**Lo que se pierde.** Prisma Studio es mejor que `drizzle-kit studio`, y el
lenguaje de esquema de Prisma se lee algo mejor que el TypeScript de Drizzle.

**Lo que se gana, además de poder trabajar.** Instalación sin descargas
adicionales, arranque más rápido, y unas 50 MB menos de dependencias.

Las migraciones se generan como SQL plano en `drizzle/` y se versionan, así que
una revisión muestra exactamente el SQL que se va a ejecutar.

### El driver: `@libsql/client`, no `better-sqlite3`

La primera versión de esta capa usaba `better-sqlite3`, síncrono, que en una
aplicación local de un solo usuario tiene sentido: la asincronía sobre SQLite no
aporta nada y complica cada consulta. Se cambió a `@libsql/client` (async) tras
un fallo real al probar la aplicación en un ordenador Windows sin herramientas
de compilación, y merece explicarse porque el motivo no es de gustos.

**Lo que pasó.** `better-sqlite3` incluye un binario ya compilado para Windows
dentro de su propio paquete npm (`prebuilds/win32-x64.node`) — en teoría no hace
falta compilar nada. Pero npm tiene un comportamiento heredado: si un paquete
contiene un `binding.gyp` y no define su propio script `install`, npm asume por
su cuenta que hay que compilarlo con `node-gyp rebuild`, sin comprobar antes si
ya existe un binario válido para la plataforma. `better-sqlite3` no define ese
script de instalación, así que en un Windows sin Python ni un compilador de C++
instalados — el caso normal de un ordenador que no es de programador — la
instalación falla con un volcado de errores de `node-gyp`, aunque el binario
que hacía falta ya estuviera ahí dentro del paquete. Se reprodujo el mismo
fallo en el entorno de desarrollo antes de decidir el cambio.

`@libsql/client` no tiene este problema: publica su binario nativo como un
paquete de npm normal por plataforma (`optionalDependency`), sin ningún
`binding.gyp` de por medio, así que `npm install` nunca intenta compilar nada.

**El coste.** Las consultas pasan a ser asíncronas. Todo lo que antes terminaba
en `.all()` o `.get()` ahora se resuelve con `await`, y las páginas de Next.js
son `async function Page()`. Es un cambio mecánico pero real: se tocaron
`src/db/index.ts`, `src/server/catalog.ts`, `src/ingest/run-tracker.ts`,
`src/ingest/shopify/sync.ts` (incluida la transacción de `persistProduct`,
verificada con transacciones async reales antes de reescribirla) y las cinco
páginas del App Router.

Se activa `journal_mode = WAL` para que la interfaz pueda leer mientras una
ingesta larga escribe, y `foreign_keys = ON` porque SQLite las trae desactivadas
de fábrica y el esquema está lleno de borrados en cascada que, si no, no
ocurrirían.

---

## 4. Sin enums en la base de datos

SQLite no tiene tipo enumerado. En lugar de simularlo, las columnas de estado
son texto y sus valores permitidos se declaran una sola vez en
`src/domain/types.ts` como esquemas de Zod, de los que se deriva el tipo de
TypeScript:

```ts
export const CandidateStatus = z.enum(['NEW', 'APPROVED', 'REJECTED', 'PARKED']);
export type CandidateStatus = z.infer<typeof CandidateStatus>;
```

Una sola importación trae el validador y el tipo. La comprobación ocurre en el
borde, que es donde puede fallar de forma útil.

---

## 5. Nada entra sin validarse

Toda respuesta de Shopify pasa por un esquema de Zod antes de llegar al resto de
la aplicación (`src/ingest/shopify/schemas.ts`). Si Shopify cambia un campo, el
fallo ocurre en esa línea, con el nombre del campo, y no tres pantallas más
tarde como un precio `undefined`.

Lo mismo con `config/sections.yaml` y con `.env`: si no validan, la aplicación
no arranca a medias, se para y explica qué falta.

**La versión de la API de Shopify está fijada** (`SHOPIFY_API_VERSION`, hoy
`2025-07`) y nunca es «la última». Shopify publica cambios que rompen cada
trimestre; una aplicación que siga la versión más reciente se rompe según el
calendario de Shopify en lugar del nuestro. Las cuatro consultas GraphQL están
validadas contra el esquema real de la API.

---

## 6. `.env` en dos mitades

`getEnv()` valida lo que la aplicación siempre necesita (base de datos, reglas
económicas, nivel de log). `getShopifyEnv()` valida las credenciales de Shopify
por separado y **devuelve un resultado en lugar de lanzar una excepción**.

Así, sin token configurado, el panel se abre igualmente y muestra un estado que
dice qué falta y dónde conseguirlo, en lugar de una traza de error en todas las
pantallas.

---

## 7. Los dos esquemas de SKU

El documento de partida daba por hecho un solo patrón, `TRD-<productId>-<talla>`.
El catálogo real tiene dos, porque los productos han entrado por dos caminos
distintos:

| Patrón | Origen | Ejemplo |
| --- | --- | --- |
| `TRD-<productId>-<sufijo>` | Creados con nuestro propio esquema. El sufijo es una talla **o un color** | `TRD-392458-S`, `TRD-389533-BLACK` |
| 15 dígitos | Importados por la aplicación oficial de Trendsi; es el `skuId` de Trendsi | `100100331278451` |

Aproximadamente la mitad del catálogo usa cada uno. Emparejar solo por el
primero dejaría la otra mitad invisible para la detección de duplicados y para
la auditoría de márgenes.

`src/domain/matching.ts` tiene por tanto tres capas, en orden de fiabilidad
decreciente, y **cada emparejamiento guarda con cuál se hizo**:

1. `TRD_SKU` — el SKU contiene el id de Trendsi. Exacto, confianza 1.
2. `TRENDSI_SKU_ID` — el SKU es el `skuId` numérico de Trendsi. Exacto, confianza 1.
3. `TITLE` — similitud de títulos normalizados, solo para productos cuyo
   proveedor ya es Trendsi. **Nunca se trata como un hecho**: se marca como
   pendiente de confirmación.

La tercera capa necesita esa cautela: *Halter Neck Maxi Dress* y *Halter Neck
Satin Maxi Dress* puntúan 0,89 de similitud y son dos productos distintos, ambos
reales del catálogo. Hay un test que lo fija para que nadie suba el umbral sin
darse cuenta.

---

## 8. El modelo de márgenes, y su pesimismo deliberado

El margen bruto es `PVP − coste real`. El neto modela lo que de verdad queda
después de un pedido devuelto:

```
ingresos retenidos = PVP × (1 − tasa de devoluciones)
comisiones         = PVP × tasa de pasarela      (en todos los pedidos)
coste de la mercancía = coste real                (en todos los pedidos)
```

Las comisiones se cobran en todos los pedidos porque Shopify no las devuelve al
reembolsar. La mercancía se pierde en todos los pedidos porque el proveedor no
repone una devolución de dropshipping y traerla de vuelta a España no sale a
cuenta.

Es un modelo conservador a propósito. Un cálculo que embellece los números es
peor que inútil cuando la decisión que alimenta es «¿meto esto en el catálogo?».

El PVP sugerido parte del margen objetivo de la sección, se redondea al `.99`
con que está construida la tienda, y luego se mete dentro de la horquilla y por
debajo del MSRP de Trendsi. **Cada uno de esos movimientos queda registrado**
en `adjustments`, con su explicación en texto, para que la ficha pueda explicar
el número final en vez de limitarse a afirmarlo.

---

## 9. Ninguna ejecución pierde un error

`RunTracker` (`src/ingest/run-tracker.ts`) abre una fila por cada ingesta y
registra cuánto tardó, cuántos elementos vio y **todos** los fallos, con su
etapa (`FETCH`, `PARSE`, `VALIDATE`, `PERSIST`, `AUTH`, `ROBOTS`) y el objeto
sobre el que ocurrieron.

Ese es el mecanismo detrás de «ningún `catch` vacío»: un fallo o se propaga, o
pasa por `recordError`, que lo escribe donde la interfaz puede mostrarlo. No hay
tercera vía.

Un producto que no se puede interpretar se registra y se salta; no tumba la
sincronización de los otros dieciocho. Y **una ejecución con errores nunca se
marca como `OK`**: pasa a `PARTIAL`.

---

## 10. Contar por clasificador, no por colección

El recuento de productos por sección se hace con el clasificador, no con las
colecciones de Shopify.

La razón es concreta: *Maxi Dresses* y *Mini & Midi Dresses* comparten la única
colección `dresses`. Contar por colección mostraba los mismos tres productos
bajo ambos encabezados, y cada sección parecía el doble de llena de lo que
estaba. El clasificador asigna cada producto a exactamente una sección, así que
los recuentos suman el catálogo. Hay un test de regresión que lo fija.

Aparte de eso, la interfaz distingue dos situaciones que parecen la misma:
una sección que **no apunta a ninguna colección** (hay que crearla) y una que
apunta a una **que no existe en Shopify** (hay que revisar el handle).

---

## 11. La interfaz

Componentes de servidor que leen la base de datos directamente. No hay una capa
de API intermedia para datos que la aplicación ya tiene en disco a un
milisegundo de distancia.

La paleta y la tipografía salen del propio tema de la tienda
(`assets/base.css`): crema y tierra, serif sobrio para titulares, superficies
planas, sin degradados ni sombras. La herramienta se parece a la marca a la que
sirve.

- **Modo claro y oscuro.** El oscuro es cálido, no gris azulado: un modo oscuro
  frío se leería como otro producto. La preferencia se aplica con un script en
  línea antes del primer pintado, porque si no la página parpadea en claro antes
  de cambiar y parece rota cada vez que se abre.
- **Accesibilidad.** Anillo de foco visible siempre, enlace de salto al
  contenido, listas y tablas con nombre accesible, y `prefers-reduced-motion`
  respetado.
- **Sin datos de ejemplo.** No hay ni una imagen de relleno en la aplicación. Un
  producto sin foto muestra un hueco que dice «sin imagen»; un producto sin
  precio dice «sin precio» en lugar de `$0.00`.

---

## 12. Los tests

| Tipo | Qué cubre |
| --- | --- |
| Unitarios | `money`, `economics`, `matching`, `sections`, `audit` — con los números reales de la tienda |
| Integración | El *parser* de Shopify contra una respuesta guardada de la tienda real |
| End-to-end | Panel → catálogo → auditoría → traza de ejecución, en navegador |

La fixture `fixtures/shopify/products-2026-07-27.json` es una respuesta real de
`norviik.myshopify.com`, recortada a cinco productos elegidos para cubrir cada
caso que el código tiene que sobrevivir: los dos esquemas de SKU, un producto
por encima de su horquilla, uno por debajo y uno en borrador sin stock. No hay
nada inventado en ella.

Los tests end-to-end corren contra una **compilación de producción** y una base
de datos desechable propia. Preparar esa base se hace en `global-setup.ts` y no
en el archivo de configuración: Playwright reevalúa la configuración en cada
proceso de trabajo, así que cualquier efecto secundario allí se repite — y
borrar la base de datos desde ahí la borraba por debajo de los tests en marcha.

---

## 13. Restricciones conocidas de esta fase

Escritas aquí para que no haya que descubrirlas:

- **Trendsi no tiene API.** La ingesta de la fase 2 será Playwright con sesión
  persistente, y el login se hace a mano una vez. No hay forma de automatizar
  ese paso, ni se intentará saltar ninguna protección.
- **Los tests end-to-end necesitan un navegador.** `npx playwright install`
  la primera vez. Si el equipo no puede descargarlo, `PLAYWRIGHT_CHROMIUM_PATH`
  permite apuntar a un Chromium ya instalado.
- **TypeScript está fijado en 5.9**, no en 7. `typescript-eslint` 8 declara
  compatibilidad hasta `<6.1.0`; usar TypeScript 7 dejaría el *linter* fuera de
  juego. Se subirá cuando `typescript-eslint` lo soporte.
