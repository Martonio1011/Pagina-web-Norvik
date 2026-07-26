/**
 * Progreso conseguido trabajando directamente sobre la tienda real (fuera de
 * esta app), que hay que reflejar aquí. Cada entrada identifica la tarea por
 * su título exacto en el seed y no toca nada si ya estaba marcada como hecha.
 */
export const AVANCES_SHOPIFY: { titulo: string; nota: string }[] = [
  {
    titulo: 'Corregir la regla de la colección "Catalog"',
    nota: 'La colección "Catalog" agrupaba todo por Proveedor = Trendsi y se solapaba con Dresses, Resort Wear y Accessories, que ya cubrían los mismos productos. Se eliminó la colección; los 19 productos siguen en sus categorías.',
  },
  {
    titulo: "Añadir imágenes a las colecciones",
    nota: "Comprobado en Shopify: Dresses, Resort Wear, Accessories y Home page ya tenían imagen.",
  },
  {
    titulo: "Crear la guía de tallas",
    nota: 'La página "Size Guide" ya existía con tabla S-2XL y cómo medirse, pero no estaba enlazada en ningún sitio. Se añadió al menú del pie de página.',
  },
  {
    titulo: "Crear el código de descuento NORVIK10",
    nota: 'Ya existía y está activo en Shopify: "Lanzamiento Norvik 10%".',
  },
];

/**
 * Los 13 productos activos de Shopify que faltaban en el Catálogo local (el
 * seed inicial solo traía los 6 que estaban sin stock). Precio, stock y coste
 * son los reales tirados de la tienda; el coste queda en 0 cuando Shopify no
 * lo tenía registrado (los 5 accesorios), a la espera de que se rellene.
 */
export const PRODUCTOS_SHOPIFY: {
  nombre: string;
  precioVenta: number;
  costeTrendsi: number;
  stock: number;
  urlShopify: string;
}[] = [
  { nombre: "18K Gold-Plated Pearl Bracelet", precioVenta: 29.99, costeTrendsi: 0, stock: 30, urlShopify: "https://admin.shopify.com/store/norviik/products/8400839278781" },
  { nombre: "Floral Spaghetti Straps Maxi Dress", precioVenta: 69.99, costeTrendsi: 28.53, stock: 60, urlShopify: "https://admin.shopify.com/store/norviik/products/8378058178749" },
  { nombre: "Halter Neck Mini Dress", precioVenta: 24.99, costeTrendsi: 11.24, stock: 60, urlShopify: "https://admin.shopify.com/store/norviik/products/8388281598141" },
  { nombre: "Halter Neck Satin Maxi Dress", precioVenta: 79.99, costeTrendsi: 16.93, stock: 180, urlShopify: "https://admin.shopify.com/store/norviik/products/8378058768573" },
  { nombre: "Off-Shoulder Bodycon Mini Dress", precioVenta: 32.99, costeTrendsi: 15.19, stock: 400, urlShopify: "https://admin.shopify.com/store/norviik/products/8388281860285" },
  { nombre: "One-Shoulder Ruched Maxi Dress", precioVenta: 79.99, costeTrendsi: 18.23, stock: 558, urlShopify: "https://admin.shopify.com/store/norviik/products/8378058997949" },
  { nombre: "Pearl & Crystal Beaded Bracelet", precioVenta: 27.99, costeTrendsi: 0, stock: 29, urlShopify: "https://admin.shopify.com/store/norviik/products/8400839344317" },
  { nombre: "Pearl Necklace with Interlocking Clasp", precioVenta: 24.99, costeTrendsi: 0, stock: 30, urlShopify: "https://admin.shopify.com/store/norviik/products/8400839213245" },
  { nombre: "Sleeveless High Slit Maxi Dress", precioVenta: 69.99, costeTrendsi: 16.49, stock: 299, urlShopify: "https://admin.shopify.com/store/norviik/products/8378058440893" },
  { nombre: "Sleeveless Side Slit Dress with Pockets", precioVenta: 36.99, costeTrendsi: 17.35, stock: 288, urlShopify: "https://admin.shopify.com/store/norviik/products/8385859977405" },
  { nombre: "Striped Woven Straw Shoulder Bag", precioVenta: 34.99, costeTrendsi: 0, stock: 17, urlShopify: "https://admin.shopify.com/store/norviik/products/8400839475389" },
  { nombre: "Tie Waist Wide Leg Jumpsuit", precioVenta: 59.99, costeTrendsi: 20.14, stock: 379, urlShopify: "https://admin.shopify.com/store/norviik/products/8378060112061" },
  { nombre: "Woven Straw Shoulder Bag", precioVenta: 44.99, costeTrendsi: 0, stock: 20, urlShopify: "https://admin.shopify.com/store/norviik/products/8400839409853" },
];
