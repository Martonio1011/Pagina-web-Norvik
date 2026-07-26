"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { PRODUCTOS_SHOPIFY } from "@/lib/sincronizacion";

function refrescar() {
  revalidatePath("/");
  revalidatePath("/catalogo");
}

function numero(valor: FormDataEntryValue | null): number {
  const n = Number(String(valor ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function datosProducto(formData: FormData) {
  return {
    nombre: String(formData.get("nombre") ?? "").trim() || "Producto sin nombre",
    costeTrendsi: numero(formData.get("costeTrendsi")),
    costeEnvio: numero(formData.get("costeEnvio")),
    precioVenta: numero(formData.get("precioVenta")),
    stock: Math.trunc(numero(formData.get("stock"))),
    estado: String(formData.get("estado") ?? "activo"),
    urlTrendsi: String(formData.get("urlTrendsi") ?? "").trim(),
    urlShopify: String(formData.get("urlShopify") ?? "").trim(),
    tieneGuiaTallas: formData.get("tieneGuiaTallas") === "on",
    tieneResenas: formData.get("tieneResenas") === "on",
    notas: String(formData.get("notas") ?? "").trim(),
  };
}

export async function crearProducto(formData: FormData) {
  await prisma.producto.create({ data: datosProducto(formData) });
  refrescar();
}

export async function actualizarProducto(formData: FormData) {
  await prisma.producto.update({
    where: { id: Number(formData.get("id")) },
    data: datosProducto(formData),
  });
  refrescar();
}

export async function borrarProducto(formData: FormData) {
  await prisma.producto.delete({ where: { id: Number(formData.get("id")) } });
  refrescar();
}

/**
 * Añade los productos activos de Shopify que aún no estén en el catálogo
 * local (comparando por nombre). No toca los que ya existan, así que se
 * puede pulsar varias veces sin duplicar filas.
 */
export async function importarProductosShopify() {
  const existentes = new Set(
    (await prisma.producto.findMany({ select: { nombre: true } })).map(
      (p) => p.nombre,
    ),
  );
  const nuevos = PRODUCTOS_SHOPIFY.filter((p) => !existentes.has(p.nombre));
  if (nuevos.length > 0) {
    await prisma.producto.createMany({
      data: nuevos.map((p) => ({
        nombre: p.nombre,
        precioVenta: p.precioVenta,
        costeTrendsi: p.costeTrendsi,
        stock: p.stock,
        estado: "activo",
        urlShopify: p.urlShopify,
        notas:
          p.costeTrendsi === 0
            ? "Falta el coste de Trendsi: Shopify no lo tenía registrado."
            : "",
      })),
    });
  }
  refrescar();
  return nuevos.length;
}
