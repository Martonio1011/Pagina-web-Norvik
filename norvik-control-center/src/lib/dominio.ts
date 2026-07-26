export const AREAS = [
  "Catalogo",
  "Legal",
  "Pagos",
  "Marketing",
  "Operaciones",
] as const;

export type Area = (typeof AREAS)[number];

export const ETIQUETA_AREA: Record<Area, string> = {
  Catalogo: "Catálogo",
  Legal: "Legal",
  Pagos: "Pagos",
  Marketing: "Marketing",
  Operaciones: "Operaciones",
};

export const ESTADOS_TAREA = ["pendiente", "en_curso", "hecha"] as const;
export type EstadoTarea = (typeof ESTADOS_TAREA)[number];

export const ETIQUETA_ESTADO: Record<EstadoTarea, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  hecha: "Hecha",
};

export const PRIORIDADES = [1, 2, 3, 4] as const;

export const ETIQUETA_PRIORIDAD: Record<number, string> = {
  1: "P1 · Bloquea ventas",
  2: "P2 · Conversión",
  3: "P3 · Marketing",
  4: "P4 · Legal y largo plazo",
};

export const ESTADOS_PEDIDO = [
  "pagado",
  "comprado_trendsi",
  "enviado",
  "tracking_enviado",
  "entregado",
] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

export const ETIQUETA_ESTADO_PEDIDO: Record<EstadoPedido, string> = {
  pagado: "Pagado",
  comprado_trendsi: "Comprado en Trendsi",
  enviado: "Enviado",
  tracking_enviado: "Tracking enviado",
  entregado: "Entregado",
};

export const ESTADOS_CONTENIDO = [
  "idea",
  "grabado",
  "editado",
  "programado",
  "publicado",
] as const;

export const ETIQUETA_ESTADO_CONTENIDO: Record<string, string> = {
  idea: "Idea",
  grabado: "Grabado",
  editado: "Editado",
  programado: "Programado",
  publicado: "Publicado",
};

export const PLATAFORMAS_CONTENIDO = ["Instagram", "TikTok"] as const;
export const PLATAFORMAS_ADS = ["Meta", "TikTok", "Google"] as const;

export const CATEGORIAS_GASTO = [
  "plataforma",
  "dominio",
  "apps",
  "ads",
  "otros",
] as const;

export const ETIQUETA_CATEGORIA_GASTO: Record<string, string> = {
  plataforma: "Plataforma",
  dominio: "Dominio",
  apps: "Apps",
  ads: "Publicidad",
  otros: "Otros",
};

export type Semaforo = "verde" | "amarillo" | "rojo";

/** Margen bruto en %, o null si faltan datos de precio o coste. */
export function margen(precioVenta: number, coste: number): number | null {
  if (precioVenta <= 0 || coste <= 0) return null;
  return ((precioVenta - coste) / precioVenta) * 100;
}

/** Precio con el margen objetivo aplicado y redondeo psicológico a ,99. */
export function precioSugerido(coste: number, margenObjetivo: number): number {
  if (coste <= 0) return 0;
  const limite = Math.min(Math.max(margenObjetivo, 0), 95);
  const bruto = coste / (1 - limite / 100);
  return Math.max(Math.ceil(bruto) - 0.01, 0.99);
}

export function roas(ventas: number, gasto: number): number | null {
  if (gasto <= 0) return null;
  return ventas / gasto;
}

export function semaforoDeProgreso(
  porcentaje: number,
  hayP1Pendiente: boolean,
): Semaforo {
  if (hayP1Pendiente || porcentaje < 40) return "rojo";
  if (porcentaje < 80) return "amarillo";
  return "verde";
}

export function parsearPasos(pasos: string): string[] {
  try {
    const valor: unknown = JSON.parse(pasos);
    if (Array.isArray(valor)) return valor.map(String);
  } catch {
    // Texto libre guardado antes de ser JSON: una línea por paso.
  }
  return pasos
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean);
}

/** Día local en formato YYYY-MM-DD, sin desplazamiento por zona horaria. */
export function claveDia(fecha = new Date()): string {
  const desplazado = new Date(
    fecha.getTime() - fecha.getTimezoneOffset() * 60000,
  );
  return desplazado.toISOString().slice(0, 10);
}
