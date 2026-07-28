# Norvik Sourcing Studio

Una aplicación que se ejecuta en tu ordenador y te dice qué producto merece la
pena traer a Norvik: busca en el catálogo de Trendsi, lo puntúa contra la
identidad de la marca, calcula lo que ganarías realmente con cada prenda y te
deja una lista corta que solo tienes que aprobar o descartar.

Toda la información vive en un único archivo en tu disco. Nada se sube a
ninguna parte. Las únicas conexiones que hace son las que tú lanzas: a tu propia
tienda de Shopify y a los proveedores.

---

## Estado actual

| Fase | Qué incluye | Estado |
| --- | --- | --- |
| **1. Cimientos** | Base de datos, sincronización con Shopify, panel, catálogo y auditoría de precios | ✅ Terminada |
| **2a. Sesión y captura de Trendsi** | Login manual guardado, límite de peticiones, caché, detección de sesión caducada y de «sin resultados», grabación de respuestas reales | ✅ Terminada |
| 2b. Parsers de Trendsi | Interpretar las respuestas grabadas y guardar productos | Esperando a la primera captura |
| 3. Inteligencia | Brand Fit Score, economía por producto, duplicados, cola de decisión, exportación | Pendiente |
| 4. Automatización | Creación en Shopify como borrador, alertas, ejecuciones programadas | Pendiente |
| 5. Competencia | Adaptadores por tienda, informe semanal de tendencias | Pendiente |

---

## Instalación, paso a paso

No hace falta saber programar. Son cuatro pasos y se hacen una sola vez.

### 1. Instalar Node.js

Necesitas **Node.js 20.11 o superior**. Descárgalo de
[nodejs.org](https://nodejs.org) y sigue el instalador; la opción por defecto
vale.

Para comprobar que ha ido bien, abre una terminal (en Mac: *Terminal*; en
Windows: *PowerShell*) y escribe:

```bash
node --version
```

Debe responder algo como `v22.x.x`.

### 2. Instalar la aplicación

En la terminal, colócate en la carpeta `studio` de este proyecto y escribe:

```bash
npm install
```

Tardará un par de minutos. Descarga todo lo que la aplicación necesita.

### 3. Crear tu archivo de configuración

En la carpeta hay un archivo llamado `.env.example`. Haz una copia y llámala
`.env`:

```bash
cp .env.example .env
```

Ábrelo con cualquier editor de texto. Solo tienes que rellenar una cosa: el
token de Shopify. Para conseguirlo:

1. Entra en tu admin de Shopify.
2. **Configuración → Aplicaciones y canales de venta → Desarrollar aplicaciones**.
3. **Crear una aplicación**, ponle el nombre que quieras (por ejemplo,
   `Norvik Sourcing Studio`).
4. En **Configurar los ámbitos de la API de Admin**, marca:
   `read_products`, `write_products`, `read_inventory` y `read_orders`.
5. **Instalar la aplicación** y pulsa en revelar el token. Empieza por `shpat_`.
6. Pega ese token en tu `.env`, en la línea `SHOPIFY_ADMIN_TOKEN`.

El archivo `.env` no se sube nunca a ningún sitio: está excluido del control de
versiones precisamente para que tu token no salga de tu ordenador.

### 4. Arrancar

```bash
npm run dev
```

Abre <http://localhost:4321> en el navegador. La primera vez verás el panel
vacío con un botón: **Sincronizar con Shopify**. Púlsalo y en unos segundos
tendrás tu catálogo real en pantalla.

---

## Uso diario

| Quiero… | Hago… |
| --- | --- |
| Abrir la aplicación | `npm run dev` y voy a <http://localhost:4321> |
| Traer los últimos cambios de la tienda | Botón **Sincronizar con Shopify** del panel |
| Sincronizar sin abrir el navegador | `npm run sync:shopify` |
| Cambiar las horquillas de precio o el margen objetivo | Editar `config/sections.yaml` |
| Ver qué falló en una ejecución | Pestaña **Ejecuciones** |

### Las pantallas

- **Panel** — cuántos productos tienes, cuántos están publicados, qué avisos hay
  abiertos, cuántos son trazables a Trendsi, y cómo de llena está cada sección
  de la tienda respecto a su horquilla de precio.
- **Catálogo** — todos tus productos con su foto real, su precio, su stock, la
  sección a la que pertenecen y su enlace directo al admin de Shopify.
- **Auditoría** — todo lo que está mal hoy: productos por encima o por debajo de
  su horquilla, publicados sin stock, fuera de colección o sin sección
  asignable. Cada aviso trae los números en los que se basa.
- **Ejecuciones** — la traza de cada sincronización: cuánto tardó, cuántos
  elementos leyó y cada error que encontró, con su detalle técnico.

---

## Conectar con Trendsi

Trendsi no tiene una forma automática de entrar: su catálogo está detrás de un
login. Así que hay un paso, y solo uno, que tienes que hacer tú a mano. Se hace
una vez y la sesión queda guardada.

**Tu contraseña no pasa nunca por esta aplicación.** Se abre una ventana de
Chrome normal y la escribes ahí, igual que cuando entras en Trendsi desde el
navegador.

### Paso 1 — Conectar

Doble clic en **`Trendsi - 1 Conectar.bat`**.

1. La primera vez descarga el navegador que necesita. Tarda un poco y solo
   ocurre una vez.
2. Se abre una ventana de Chrome en la página de Trendsi.
3. Escribe tu email y tu contraseña y entra como siempre.
4. **No cierres la ventana.** El programa detecta solo que ya has entrado, la
   cierra él y te dice «Sesión guardada correctamente».

Si aparece una verificación de seguridad, la aplicación se detiene y te avisa.
No intenta resolverla ni saltársela: eso no se hace.

### Paso 2 — Capturar

Doble clic en **`Trendsi - 2 Capturar.bat`**.

Hace cinco búsquedas cortas, esperando unos segundos entre cada una para no
molestar a los servidores de Trendsi, y guarda lo que Trendsi responde en la
carpeta `fixtures\trendsi`. Al terminar te abre esa carpeta.

Verás dos archivos por búsqueda:

- `search-....json` — la respuesta completa, **con tus datos personales ya
  borrados** (email, teléfono, dirección: todo eso se sustituye por
  `[redactado]` antes de guardar nada).
- `search-...-RESUMEN.txt` — un resumen legible que describe la *forma* de los
  datos, sin los valores.

Esos archivos son lo que hace falta para escribir el lector del catálogo. Sin
ellos habría que adivinar la estructura, y una estructura adivinada que acaba
en la base de datos es mucho peor que una función que falta.

### Por qué este paso no se puede automatizar

Trendsi no publica ninguna API. No es una limitación de esta aplicación: no
existe forma legítima de entrar sin que una persona escriba sus credenciales.
Lo que sí está automatizado es todo lo demás.

---

## Ajustar las reglas de negocio

Las reglas no están dentro del código. Viven en archivos que puedes editar tú.

### `config/sections.yaml`

Define las seis secciones de la tienda: su horquilla de precio, su margen
objetivo y cómo se decide a qué sección pertenece un producto.

```yaml
- key: maxi-dresses
  label: Maxi Dresses
  priceBand: { min: 42, max: 72 }   # PVP en dólares
  targetMargin: 0.65                # margen bruto objetivo
  collections: [dresses]            # handle de la colección en Shopify
```

Si cambias una horquilla, guarda el archivo y recarga la página. Si escribes
algo que no es válido, la aplicación te lo dirá con el nombre exacto del campo
en lugar de arrancar con reglas a medio cargar.

### `.env`

Los parámetros económicos: coste de envío estimado (`DEFAULT_SHIPPING_COST`,
por defecto $5,50), comisión de pasarela (`PAYMENT_FEE_RATE`, 3%) y tasa de
devoluciones esperada (`RETURN_RATE`, 8%).

---

## Comandos

```bash
npm run dev            # arranca la aplicación en modo desarrollo
npm run build          # compila la versión de producción
npm start              # arranca la versión compilada

npm run sync:shopify   # sincroniza con Shopify desde la terminal
npm run db:migrate     # aplica las migraciones de base de datos
npm run db:studio      # abre un visor de la base de datos

npm test               # tests unitarios y de integración
npm run test:e2e       # test end-to-end con navegador real
npm run typecheck      # comprueba los tipos
npm run lint           # comprueba el estilo del código
npm run verify         # todo lo anterior de una vez
```

---

## Si algo va mal

**«Your .env is incomplete or invalid»** — falta o está mal escrita alguna
variable. El mensaje dice exactamente cuál y qué se espera.

**«Shopify rejected the admin token»** — el token es incorrecto, ha caducado o
la aplicación no tiene los permisos necesarios. Vuelve al paso 3 y revisa los
ámbitos.

**«Sales history skipped»** — no es un error. Significa que tu token no incluye
el permiso `read_orders`. Todo lo demás se sincroniza igual; solo faltarán los
datos de ventas.

**Las fotos no se ven** — la aplicación no aloja imágenes: las pide al CDN de
Shopify en el momento. Si no cargan, revisa tu conexión.

**Quiero empezar de cero** — borra el archivo `norvik-studio.db` y ejecuta
`npm run db:migrate` seguido de una sincronización. No se pierde nada que no
esté ya en Shopify.

---

## Cómo está construido

Ver [`ARCHITECTURE.md`](./ARCHITECTURE.md) para las decisiones técnicas y sus
porqués.
