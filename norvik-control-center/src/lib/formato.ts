export function dinero(valor: number, moneda = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 2,
  }).format(valor);
}

export function decimal(valor: number | null, decimales = 2): string {
  if (valor === null || Number.isNaN(valor)) return "—";
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor);
}

export function porcentaje(valor: number | null, decimales = 0): string {
  if (valor === null || Number.isNaN(valor)) return "—";
  return `${decimal(valor, decimales)} %`;
}

export function fechaCorta(fecha: Date | string | null): string {
  if (!fecha) return "—";
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** Valor para un <input type="date"> a partir de una fecha. */
export function valorInputFecha(fecha: Date | string | null): string {
  if (!fecha) return "";
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const desplazado = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return desplazado.toISOString().slice(0, 10);
}

export function mesLargo(clave: string): string {
  const [anio, mes] = clave.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(new Date(anio, mes - 1, 1));
}
