"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

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
