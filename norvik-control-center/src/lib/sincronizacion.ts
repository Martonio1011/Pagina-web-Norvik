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
