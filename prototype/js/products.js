/* Catálogo de muestra — en Shopify esto vendrá de `collection.products` / `all_products` */
const NORVIK_PRODUCTS = [
  {
    id: 'camisa-lino-oversize',
    name: 'camisa de lino oversize',
    category: 'ropa',
    tone: 'sand',
    price: 89,
    compareAt: null,
    badge: 'nuevo',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['#D8C9B0', '#2B2621', '#8A9A80'],
    desc: 'confeccionada en lino 100% de origen europeo, con corte relajado y caída fluida. una pieza atemporal que acompaña desde el desayuno en la terraza hasta la cena junto al mar.'
  },
  {
    id: 'vestido-pareo-algodon',
    name: 'vestido pareo de algodón',
    category: 'ropa',
    tone: 'tan',
    price: 125,
    compareAt: 155,
    badge: 'rebajado',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['#B79F82', '#2B2621'],
    desc: 'silueta envolvente en popelín de algodón orgánico, con abertura lateral y cierre de cinta. pensado para llevarse directo de la playa a la calle.'
  },
  {
    id: 'pantalon-wide-leg-lino',
    name: 'pantalón wide-leg de lino',
    category: 'ropa',
    tone: 'sage',
    price: 98,
    compareAt: null,
    badge: null,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['#8A9A80', '#D8C9B0'],
    desc: 'pretina alta y pierna ancha en lino lavado, con caída estructurada que se mueve con naturalidad. incluye forro interior de algodón.'
  },
  {
    id: 'kaftan-bordado-mano',
    name: 'kaftán bordado a mano',
    category: 'ropa',
    tone: 'sand',
    price: 168,
    compareAt: null,
    badge: 'edición limitada',
    sizes: ['Único'],
    colors: ['#D8C9B0'],
    desc: 'pieza artesanal bordada a mano por un taller familiar en la costa mediterránea. cada unidad presenta variaciones sutiles, prueba de su origen manual.'
  },
  {
    id: 'banador-halter-recto',
    name: 'bañador halter recto',
    category: 'bano',
    tone: 'dark',
    price: 76,
    compareAt: null,
    badge: null,
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['#2B2621', '#B79F82'],
    desc: 'bañador de una pieza con espalda cruzada y tejido de secado rápido con protección UPF 50+. forro interior moldeador sin aros.'
  },
  {
    id: 'camisa-popelin-rayas',
    name: 'camisa popelín de rayas',
    category: 'ropa',
    tone: 'sand',
    price: 82,
    compareAt: null,
    badge: null,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['#D8C9B0', '#8A9A80'],
    desc: 'rayas finas tejidas en popelín de algodón egipcio, cuello camisero y puño ajustable. una pieza versátil para toda la temporada.'
  },
  {
    id: 'falda-midi-lino-crudo',
    name: 'falda midi de lino crudo',
    category: 'ropa',
    tone: 'tan',
    price: 94,
    compareAt: null,
    badge: null,
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['#B79F82'],
    desc: 'falda midi de corte lápiz en lino crudo sin blanquear, con botonadura frontal funcional y bolsillos laterales ocultos.'
  },
  {
    id: 'top-canale-sin-mangas',
    name: 'top de canalé sin mangas',
    category: 'ropa',
    tone: 'sage',
    price: 54,
    compareAt: 68,
    badge: 'rebajado',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['#8A9A80', '#2B2621', '#D8C9B0'],
    desc: 'punto de canalé fino en algodón elástico, escote redondo y largo a la cadera. ideal como segunda piel bajo camisas abiertas.'
  },
  {
    id: 'banador-bandeau-triangulo',
    name: 'bikini bandeau y braga clásica',
    category: 'bano',
    tone: 'dark',
    price: 68,
    compareAt: null,
    badge: 'nuevo',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['#2B2621', '#D8C9B0'],
    desc: 'conjunto de dos piezas en tejido técnico mate, con relleno extraíble y braga de talle medio. costuras planas para máxima comodidad.'
  },
  {
    id: 'sombrero-paja-ala-ancha',
    name: 'sombrero de paja de ala ancha',
    category: 'accesorios',
    tone: 'sand',
    price: 62,
    compareAt: null,
    badge: null,
    sizes: ['Único'],
    colors: ['#D8C9B0'],
    desc: 'trenzado a mano en paja natural de palma, cinta interior ajustable y lazo de algodón crudo a juego.'
  },
  {
    id: 'bolso-tote-rafia',
    name: 'bolso tote de rafia',
    category: 'accesorios',
    tone: 'tan',
    price: 79,
    compareAt: null,
    badge: null,
    sizes: ['Único'],
    colors: ['#B79F82'],
    desc: 'tejido de rafia natural con asas de cuero vegetal y cierre de botón imantado. bolsillo interior con cremallera.'
  },
  {
    id: 'sandalias-cuero-plano',
    name: 'sandalias planas de cuero',
    category: 'accesorios',
    tone: 'sage',
    price: 118,
    compareAt: null,
    badge: null,
    sizes: ['36', '37', '38', '39', '40', '41'],
    colors: ['#8A9A80', '#2B2621'],
    desc: 'sandalias artesanales en cuero curtido vegetal, plantilla anatómica forrada y suela de goma natural antideslizante.'
  }
];

const NORVIK_TAX = 0; // precios ya incluyen impuestos, como en la mayoría de tiendas Shopify EU

function norvikFormatPrice(value) {
  return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function norvikGetProduct(id) {
  return NORVIK_PRODUCTS.find(function (p) { return p.id === id; });
}
