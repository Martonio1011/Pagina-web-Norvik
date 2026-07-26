import { aCsv, TABLAS, type Tabla, volcarTodo } from "@/lib/exportar";
import { claveDia } from "@/lib/dominio";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const parametros = new URL(request.url).searchParams;
  const formato = parametros.get("formato") === "csv" ? "csv" : "json";
  const datos = await volcarTodo();
  const fecha = claveDia();

  if (formato === "json") {
    return new Response(JSON.stringify(datos, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="norvik-${fecha}.json"`,
      },
    });
  }

  const tabla = parametros.get("tabla") as Tabla | null;
  if (!tabla || !TABLAS.includes(tabla)) {
    return new Response(`Tabla no válida. Opciones: ${TABLAS.join(", ")}`, {
      status: 400,
    });
  }

  const filas = datos[tabla] as unknown as Record<string, unknown>[];
  return new Response(aCsv(filas) || "Sin datos", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="norvik-${tabla}-${fecha}.csv"`,
    },
  });
}
