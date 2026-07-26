/**
 * Contenido inicial del Control Center.
 *
 * Lo usan tanto `prisma/seed.ts` como la comprobación automática que corre al
 * abrir la aplicación, para que ambos carguen exactamente lo mismo.
 */
import { prisma } from "./db";

type SemillaTarea = {
  titulo: string;
  descripcion: string;
  pasos: string[];
  prioridad: number;
  area: string;
  estado: string;
};

const TAREAS: SemillaTarea[] = [
  // ─────────────────────────── Ya hecho ───────────────────────────
  {
    titulo: "19 productos publicados con fotos y descripciones",
    descripcion:
      "El catálogo inicial ya está online: 19 productos importados de Trendsi con imágenes y textos propios.",
    prioridad: 1,
    area: "Catalogo",
    estado: "hecha",
    pasos: [
      "Importar los productos desde la app de Trendsi.",
      "Revisar que cada ficha tenga al menos 3 imágenes limpias.",
      "Reescribir la descripción para que no sea la del proveedor.",
      "Publicarlos en el canal Tienda online.",
    ],
  },
  {
    titulo: "5 colecciones creadas",
    descripcion:
      "Las colecciones que organizan el catálogo ya existen y están publicadas en el menú.",
    prioridad: 1,
    area: "Catalogo",
    estado: "hecha",
    pasos: [
      "Crear las colecciones en Productos › Colecciones.",
      "Asignar productos a cada colección.",
      "Enlazarlas desde el menú de navegación principal.",
    ],
  },
  {
    titulo: "Políticas legales publicadas",
    descripcion:
      "Privacidad, devoluciones, envíos y términos del servicio están publicadas y enlazadas en el pie de página.",
    prioridad: 1,
    area: "Legal",
    estado: "hecha",
    pasos: [
      "Generar los borradores en Configuración › Políticas.",
      "Adaptar los textos a España y al plazo real de Trendsi.",
      "Comprobar que aparecen enlazadas en el footer.",
    ],
  },
  {
    titulo: "Páginas Contact, About, FAQs y Track Order publicadas",
    descripcion:
      "Las cuatro páginas de confianza están creadas y accesibles desde el menú o el pie de página.",
    prioridad: 1,
    area: "Legal",
    estado: "hecha",
    pasos: [
      "Crear las páginas en Tienda online › Páginas.",
      "Añadir un formulario de contacto real en Contact.",
      "Enlazar Track Order al servicio de seguimiento que uses.",
    ],
  },
  {
    titulo: "Plan Shopify Basic activo",
    descripcion:
      "La tienda tiene plan de pago, así que ya puede cobrar y quitar la contraseña de acceso.",
    prioridad: 1,
    area: "Operaciones",
    estado: "hecha",
    pasos: [
      "Contratar el plan Basic en Configuración › Plan.",
      "Quitar la protección con contraseña en Tienda online › Preferencias.",
      "Anotar el coste mensual en el módulo de Finanzas.",
    ],
  },

  // ───────────────────── P1 · Bloquea ventas ─────────────────────
  {
    titulo: "Arreglar los 6 productos activos con stock 0",
    descripcion:
      "Hay 6 productos publicados que no se pueden comprar: One-Shoulder Bow Mini Dress, Halter Neck Maxi Dress, Eyelet Grecian Neck Mini Dress, Lace Trim Midi Plus Size, Halter Neck Wide-Leg Jumpsuit y Cowl Neck Wide-Leg Jumpsuit. Un producto activo sin stock quema tráfico y hunde la confianza.",
    prioridad: 1,
    area: "Catalogo",
    estado: "pendiente",
    pasos: [
      "Abre la app de Trendsi dentro de Shopify y busca cada uno de los 6 productos.",
      "Comprueba si el proveedor tiene stock real en alguna talla o color.",
      "Si hay stock: vuelve a sincronizar el producto para que Shopify reciba las cantidades correctas.",
      "Si NO hay stock: en Shopify pon el producto en Borrador, o déjalo activo pero oculto de las colecciones.",
      "Nunca actives \"seguir vendiendo sin stock\" en dropshipping: acabarías vendiendo algo que no puedes servir.",
      "Repite el proceso para los 6 y anota en Catálogo cuáles quedan publicados.",
      "Revisa que ninguna colección de portada quede vacía después de la limpieza.",
    ],
  },
  {
    titulo: "Comprar y conectar un dominio propio",
    descripcion:
      "Vender desde norviik.myshopify.com destruye la conversión. Necesitas un dominio propio tipo norvik.com o norvik.es antes de gastar un euro en publicidad.",
    prioridad: 1,
    area: "Operaciones",
    estado: "pendiente",
    pasos: [
      "Decide el dominio: .com si vendes fuera de España, .es si te centras en el mercado español.",
      "Compra el dominio (lo más simple es hacerlo desde Shopify › Configuración › Dominios › Comprar dominio, así se configura solo).",
      "Si lo compras fuera (Namecheap, Dondominio…), añádelo en Shopify como dominio existente.",
      "En el panel del registrador, apunta el registro A a la IP que indique Shopify y el CNAME de www a shops.myshopify.com.",
      "Espera a que el DNS propague (de minutos a 48 h) y comprueba que el candado HTTPS aparece.",
      "Marca el dominio nuevo como dominio principal en Shopify.",
      "Anota el coste anual del dominio en el módulo de Finanzas.",
    ],
  },
  {
    titulo: "Verificar la pasarela de pago y hacer un pedido de prueba",
    descripcion:
      "Hasta que no completes tú mismo una compra real de principio a fin no sabes si la tienda cobra. Es el último punto que puede bloquear todas las ventas.",
    prioridad: 1,
    area: "Pagos",
    estado: "pendiente",
    pasos: [
      "Entra en Configuración › Pagos y confirma que Shopify Payments (o el proveedor que uses) está activado y verificado.",
      "Completa los datos fiscales y la cuenta bancaria donde quieres cobrar.",
      "Revisa qué métodos aceptas: tarjeta, PayPal, Apple Pay, Google Pay.",
      "Haz un pedido real de importe bajo con tu propia tarjeta, sin modo prueba.",
      "Comprueba que recibes el email de confirmación y que el pedido aparece en el panel.",
      "Comprueba en Trendsi que puedes cursar ese pedido al proveedor.",
      "Reembolsa el pedido de prueba desde Shopify y verifica que el reembolso también funciona.",
      "Anota en las notas cuánto tarda el dinero en llegar a tu banco.",
    ],
  },
  {
    titulo: 'Corregir la regla de la colección "Catalog"',
    descripcion:
      'La colección automática "Catalog" tiene una condición mal puesta, así que muestra productos que no debería o se queda vacía.',
    prioridad: 1,
    area: "Catalogo",
    estado: "pendiente",
    pasos: [
      'Abre Productos › Colecciones › Catalog.',
      "Mira si el tipo es Automática y qué condiciones tiene.",
      'Cambia la condición a algo que sí cumplan tus productos, por ejemplo "El precio del producto es mayor que 0" o "El producto está publicado".',
      "Guarda y comprueba cuántos productos entran en la colección.",
      "Abre la colección en la tienda y confirma que se ve bien en móvil.",
      "Si la colección no aporta nada frente a las otras 5, bórrala en lugar de arreglarla.",
    ],
  },

  // ─────────────────────── P2 · Conversión ───────────────────────
  {
    titulo: "Decidir mercado y moneda (USD vs EUR con Shopify Markets)",
    descripcion:
      "Trendsi factura en dólares y envía desde EE. UU., pero tú estás en España. Decidir a quién vendes determina moneda, plazos de envío, impuestos y creatividades.",
    prioridad: 2,
    area: "Pagos",
    estado: "pendiente",
    pasos: [
      "Compara: vender a EE. UU. da envíos rápidos y costes bajos; vender a España da cercanía pero plazos más largos desde Trendsi.",
      "Elige un mercado principal y no dos a la vez al arrancar.",
      "Entra en Configuración › Mercados y define ese mercado como principal.",
      "Fija la moneda de venta acorde: USD si vendes a EE. UU., EUR si vendes a España.",
      "Configura los países a los que envías y desactiva el resto.",
      "Revisa los precios: al cambiar de moneda los márgenes cambian.",
      "Ajusta los plazos de entrega que muestras en la página de envíos a lo que Trendsi cumple de verdad.",
    ],
  },
  {
    titulo: "Revisar precios y márgenes (objetivo 60-70 % bruto)",
    descripcion:
      "Sin un margen bruto del 60-70 % no queda dinero para pagar la publicidad. Hay que revisar producto a producto y redondear a ,99.",
    prioridad: 2,
    area: "Catalogo",
    estado: "pendiente",
    pasos: [
      "Apunta para cada producto el coste de Trendsi y el coste de envío.",
      "Usa la calculadora del módulo Catálogo con margen objetivo 65 %.",
      "Redondea siempre a ,99 (29,99 en lugar de 30,00).",
      "Comprueba que el precio resultante es creíble para el producto; si no lo es, ese producto no sirve para vender con publicidad.",
      "Añade un precio comparativo tachado solo si el descuento es real.",
      "Actualiza los precios en Shopify y luego en la tabla de Catálogo de esta app.",
      "Revisa que ningún producto quede por debajo del 50 % de margen.",
    ],
  },
  {
    titulo: "Instalar una app de reseñas (Judge.me o Loox)",
    descripcion:
      "Una tienda nueva sin ninguna reseña convierte muy poco. Las reseñas con foto son la prueba social más barata que puedes conseguir.",
    prioridad: 2,
    area: "Marketing",
    estado: "pendiente",
    pasos: [
      "Elige la app: Judge.me tiene plan gratuito generoso, Loox está más orientada a reseñas con foto.",
      "Instálala desde la Shopify App Store.",
      "Coloca el widget de estrellas en la ficha de producto y en las tarjetas de colección.",
      "Importa las reseñas del producto en AliExpress o Trendsi solo si son del mismo producto exacto.",
      "Configura el email automático que pide reseña unos días después de la entrega.",
      "Añade una sección de reseñas destacadas en la portada.",
    ],
  },
  {
    titulo: "Añadir imágenes a las colecciones",
    descripcion:
      "Las colecciones sin imagen se ven como cajas grises y hacen que la portada parezca inacabada.",
    prioridad: 2,
    area: "Catalogo",
    estado: "pendiente",
    pasos: [
      "Elige para cada colección la foto más limpia y vertical de sus productos.",
      "Recorta todas al mismo formato para que la portada quede alineada.",
      "Súbelas en Productos › Colecciones › Imagen de la colección.",
      "Escribe el texto alternativo de cada imagen (ayuda al SEO y a la accesibilidad).",
      "Comprueba en móvil que los títulos se leen bien sobre la imagen.",
    ],
  },
  {
    titulo: "Crear la guía de tallas",
    descripcion:
      "En moda femenina la talla es el motivo número uno de devolución y de carrito abandonado. Trendsi usa tallas americanas, tu cliente puede esperar europeas.",
    prioridad: 2,
    area: "Catalogo",
    estado: "pendiente",
    pasos: [
      "Copia las medidas reales de las fichas de Trendsi (busto, cintura, cadera, largo).",
      "Crea una tabla con la equivalencia US ↔ EU si vendes en España.",
      "Crea una página \"Guía de tallas\" en Tienda online › Páginas.",
      "Enlázala desde cada ficha de producto, junto al selector de talla.",
      "Añade una frase sobre el ajuste (\"la modelo mide 1,75 m y lleva una S\").",
      "Marca en el módulo Catálogo qué productos ya tienen guía de tallas.",
    ],
  },

  // ─────────────────────── P3 · Marketing ────────────────────────
  {
    titulo: "Instalar el píxel de Meta y el de TikTok",
    descripcion:
      "Sin píxel no puedes medir ventas ni hacer remarketing, y las campañas nunca aprenden. Debe estar puesto antes de gastar el primer euro en anuncios.",
    prioridad: 3,
    area: "Marketing",
    estado: "pendiente",
    pasos: [
      "Crea una cuenta en Meta Business Manager y dentro un píxel.",
      "Instala el canal de ventas Facebook e Instagram en Shopify y conéctalo al píxel.",
      "Activa la API de conversiones para no perder eventos por los bloqueadores.",
      "Repite con TikTok: crea TikTok for Business e instala el canal TikTok en Shopify.",
      "Comprueba con la extensión Meta Pixel Helper que se disparan PageView, ViewContent, AddToCart y Purchase.",
      "Haz una compra de prueba y confirma que el evento Purchase llega con el importe correcto.",
    ],
  },
  {
    titulo: "Configurar GA4 y Google Search Console",
    descripcion:
      "GA4 te dice de dónde viene el tráfico y dónde se cae la gente; Search Console te dice si Google puede indexar la tienda.",
    prioridad: 3,
    area: "Marketing",
    estado: "pendiente",
    pasos: [
      "Crea una propiedad GA4 en analytics.google.com.",
      "Instala la app Google & YouTube en Shopify y conéctala a tu cuenta de Google.",
      "Verifica que el flujo de datos recibe visitas en tiempo real.",
      "Da de alta el dominio en Google Search Console.",
      "Verifica la propiedad con el registro DNS o con la etiqueta HTML.",
      "Envía el sitemap: tudominio.com/sitemap.xml.",
      "Revisa a los pocos días qué páginas ha indexado Google.",
    ],
  },
  {
    titulo: "Crear Instagram y TikTok con 9-12 publicaciones",
    descripcion:
      "Un perfil vacío mata la confianza. Antes de mandar tráfico, el perfil tiene que parecer una marca viva.",
    prioridad: 3,
    area: "Marketing",
    estado: "pendiente",
    pasos: [
      "Crea las cuentas @norvik (o la variante libre) en Instagram y TikTok como cuentas de empresa.",
      "Pon foto de perfil, biografía clara y el enlace a la tienda.",
      "Prepara 9-12 publicaciones antes de empezar: producto, detalle de tejido, look completo, vídeo corto.",
      "Usa el calendario de contenidos de esta app para planificar las fechas.",
      "Publica las 9-12 en pocos días para que el perfil no se vea vacío.",
      "Conecta el catálogo de Shopify para etiquetar productos en las publicaciones.",
      "Fija a partir de ahí un ritmo sostenible: 3-4 publicaciones por semana.",
    ],
  },
  {
    titulo: "Montar los emails automáticos (carrito abandonado, bienvenida y post-compra)",
    descripcion:
      "El email es el canal más rentable de una tienda pequeña. Con tres automatizaciones recuperas ventas que ya estaban perdidas.",
    prioridad: 3,
    area: "Marketing",
    estado: "pendiente",
    pasos: [
      "Elige la herramienta: Shopify Email es gratis hasta cierto volumen, Klaviyo es más potente.",
      "Activa el carrito abandonado: primer email a la hora, segundo a las 24 h con el código de descuento.",
      "Crea la serie de bienvenida para quien se suscribe: quién eres, qué vendes, el descuento de bienvenida.",
      "Crea el email post-compra: confirmación, plazos reales de Trendsi y cómo seguir el pedido.",
      "Añade unos días después el email que pide la reseña.",
      "Revisa que todos los emails se ven bien en móvil.",
      "Comprueba cada semana la tasa de apertura y las ventas atribuidas.",
    ],
  },
  {
    titulo: "Poner el pop-up de captación con descuento",
    descripcion:
      "El pop-up convierte visitas anónimas en suscriptores, que es a quien luego le puedes vender por email sin pagar publicidad.",
    prioridad: 3,
    area: "Marketing",
    estado: "pendiente",
    pasos: [
      "Usa el formulario de Shopify Email o el de Klaviyo, no hace falta otra app.",
      "Configúralo para que aparezca a los 10-15 segundos, no al entrar.",
      "Ofrece el 10 % de la primera compra a cambio del email.",
      "Desactívalo o retrásalo en la página de pago para no estorbar.",
      "Comprueba que en móvil se puede cerrar con facilidad.",
      "Conecta el formulario con la serie de bienvenida para que el código llegue solo.",
    ],
  },
  {
    titulo: "Crear el código de descuento NORVIK10",
    descripcion:
      "Es el código que usarás en el pop-up, en la bienvenida y en el carrito abandonado. Debe existir antes que ellos.",
    prioridad: 3,
    area: "Marketing",
    estado: "pendiente",
    pasos: [
      "Entra en Descuentos › Crear descuento › Código de descuento.",
      "Nómbralo NORVIK10 con un 10 % sobre el total del pedido.",
      "Limítalo a un uso por cliente y solo a la primera compra.",
      "Comprueba que con ese 10 % el margen sigue por encima del 50 %.",
      "Pruébalo tú en el checkout antes de publicarlo.",
      "Añádelo a la lista de códigos activos del módulo Marketing.",
    ],
  },
  {
    titulo: "Lanzar la primera campaña de Meta Ads",
    descripcion:
      "Primera prueba de fuego: 10-20 € al día, entre 3 y 5 creatividades, y una decisión clara a los 4-5 días. Solo cuando el píxel, el dominio y los precios estén listos.",
    prioridad: 3,
    area: "Marketing",
    estado: "pendiente",
    pasos: [
      "Confirma antes que el píxel dispara Purchase y que el dominio propio ya está activo.",
      "Crea una campaña de objetivo Ventas con la conversión Compra.",
      "Presupuesto de 10-20 € al día a nivel de campaña (CBO).",
      "Un solo conjunto de anuncios con segmentación amplia: país, mujeres, 18-45.",
      "Sube entre 3 y 5 creatividades distintas: vídeo, foto de producto, carrusel.",
      "No toques nada durante los primeros 3 días: la campaña está aprendiendo.",
      "Al cuarto o quinto día evalúa: ROAS por encima de 1,5 se escala, por debajo de 1 se corta.",
      "Apaga las creatividades sin clics y duplica la que mejor funcione.",
      "Anota gasto y ventas en el registro de campañas de esta app.",
    ],
  },

  // ────────────────── P4 · Legal España y operaciones ──────────────────
  {
    titulo: "Darse de alta como autónomo y presentar el modelo 036/037",
    descripcion:
      "Para facturar de forma legal en España hay que estar dado de alta en Hacienda y en la Seguridad Social. Conviene hacerlo cuando las ventas empiecen a ser recurrentes.",
    prioridad: 4,
    area: "Legal",
    estado: "pendiente",
    pasos: [
      "Consulta con una gestoría o con un asesor: es barato y evita errores caros.",
      "Presenta el modelo 036 o 037 en Hacienda para el alta censal.",
      "Elige los epígrafes de IAE de comercio electrónico minorista.",
      "Date de alta en el RETA en la Seguridad Social dentro de los 60 días siguientes.",
      "Solicita la tarifa plana de autónomos si te corresponde.",
      "Consigue un certificado digital para hacer los trámites online.",
      "Anota la cuota mensual de autónomos como gasto fijo en Finanzas.",
    ],
  },
  {
    titulo: "Revisar el IVA: OSS e IOSS",
    descripcion:
      "Vender desde España con un proveedor que envía desde fuera de la UE tiene reglas de IVA propias. Equivocarse aquí sale caro más adelante.",
    prioridad: 4,
    area: "Legal",
    estado: "pendiente",
    pasos: [
      "Aclara desde dónde envía Trendsi cada pedido: EE. UU. o almacén europeo.",
      "Si vendes a consumidores de otros países de la UE, revisa el umbral de 10.000 € y el registro en la ventanilla única OSS.",
      "Si el envío entra desde fuera de la UE por menos de 150 €, estudia el régimen IOSS.",
      "Configura los impuestos en Shopify › Configuración › Impuestos según lo que te confirme tu asesor.",
      "Comprueba si los precios que muestras deben incluir el IVA (en España, sí).",
      "Guarda todas las facturas de Trendsi: son tu gasto deducible.",
    ],
  },
  {
    titulo: "Crear un email profesional con el dominio propio",
    descripcion:
      "Contestar desde una cuenta de Gmail personal resta credibilidad. Necesitas hola@tudominio.com.",
    prioridad: 4,
    area: "Operaciones",
    estado: "pendiente",
    pasos: [
      "Espera a tener el dominio propio conectado.",
      "Elige proveedor: Zoho Mail tiene plan gratuito, Google Workspace es de pago.",
      "Crea el buzón hola@tudominio.com y, si quieres, pedidos@tudominio.com.",
      "Añade los registros MX, SPF y DKIM en el DNS del dominio.",
      "Envía y recibe un correo de prueba para confirmar que funciona.",
      "Cambia el email del remitente en Shopify › Configuración › Notificaciones.",
      "Actualiza el email de la página de contacto y del pie de página.",
    ],
  },
  {
    titulo: "Documentar el flujo diario de pedidos con Trendsi",
    descripcion:
      "Escribir el proceso paso a paso evita olvidos cuando lleguen varios pedidos el mismo día y te permite delegarlo más adelante.",
    prioridad: 4,
    area: "Operaciones",
    estado: "pendiente",
    pasos: [
      "Anota qué haces desde que entra un pedido hasta que el cliente lo recibe.",
      "Define el momento del día en el que revisas los pedidos nuevos (por ejemplo, cada mañana).",
      "Escribe cómo cursas el pedido en Trendsi y con qué tarjeta lo pagas.",
      "Escribe cómo pasas el número de seguimiento a Shopify para que el cliente reciba el aviso.",
      "Define qué contestas ante un retraso, una talla equivocada o una devolución.",
      "Fija el plazo máximo en el que respondes un email de cliente (24 h es razonable).",
      "Guarda el documento y refleja los pasos en el checklist diario de esta app.",
    ],
  },
];

const TAREAS_DIARIAS = [
  {
    titulo: "Revisar los pedidos nuevos de Shopify",
    detalle: "Cursar en Trendsi todo lo que haya entrado desde ayer.",
  },
  {
    titulo: "Responder los emails y mensajes de clientes",
    detalle: "Objetivo: ninguna consulta con más de 24 h sin contestar.",
  },
  {
    titulo: "Revisar el stock en Trendsi",
    detalle: "Pasar a borrador lo que se haya quedado sin existencias.",
  },
  {
    titulo: "Actualizar los números de seguimiento",
    detalle: "Pasar el tracking de Trendsi a Shopify para que avise al cliente.",
  },
  {
    titulo: "Mirar el gasto y el ROAS de las campañas activas",
    detalle: "Sin tocar nada si la campaña lleva menos de 3 días.",
  },
];

const PRODUCTOS_SIN_STOCK = [
  "One-Shoulder Bow Mini Dress",
  "Halter Neck Maxi Dress",
  "Eyelet Grecian Neck Mini Dress",
  "Lace Trim Midi Plus Size",
  "Halter Neck Wide-Leg Jumpsuit",
  "Cowl Neck Wide-Leg Jumpsuit",
];

/**
 * Carga el contenido inicial si la base está vacía. Es idempotente: cada bloque
 * solo escribe cuando su tabla no tiene nada, así que se puede llamar siempre.
 */
export async function asegurarDatosIniciales() {
  await prisma.ajustes.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  if ((await prisma.tarea.count()) === 0) {
    await prisma.tarea.createMany({
      data: TAREAS.map((tarea, indice) => ({
        titulo: tarea.titulo,
        descripcion: tarea.descripcion,
        pasos: JSON.stringify(tarea.pasos),
        prioridad: tarea.prioridad,
        area: tarea.area,
        estado: tarea.estado,
        orden: indice,
      })),
    });
  }

  if ((await prisma.tareaDiaria.count()) === 0) {
    await prisma.tareaDiaria.createMany({
      data: TAREAS_DIARIAS.map((tarea, indice) => ({ ...tarea, orden: indice })),
    });
  }

  if ((await prisma.producto.count()) === 0) {
    await prisma.producto.createMany({
      data: PRODUCTOS_SIN_STOCK.map((nombre) => ({
        nombre,
        stock: 0,
        estado: "activo",
        notas:
          "Detectado con stock 0. Falta rellenar coste de Trendsi y precio de venta.",
      })),
    });
  }

  if ((await prisma.gasto.count()) === 0) {
    await prisma.gasto.create({
      data: {
        categoria: "plataforma",
        concepto: "Plan Shopify Basic",
        importe: 0,
        recurrente: true,
        notas: "Pon aqui el importe exacto que te cobra Shopify cada mes.",
      },
    });
  }
}
