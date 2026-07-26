"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

function refrescar() {
  revalidatePath("/");
  revalidatePath("/pedidos");
  revalidatePath("/finanzas");
}

function numero(valor: FormDataEntryValue | null): number {
  const n = Number(String(valor ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function fecha(valor: FormDataEntryValue | null): Date {
  const texto = String(valor ?? "").trim();
  return texto ? new Date(`${texto}T12:00:00`) : new Date();
}

function datosPedido(formData: FormData) {
  return {
    numeroPedido: String(formData.get("numeroPedido") ?? "").trim(),
    cliente: String(formData.get("cliente") ?? "").trim(),
    producto: String(formData.get("producto") ?? "").trim(),
    fecha: fecha(formData.get("fecha")),
    estadoFlujo: String(formData.get("estadoFlujo") ?? "pagado"),
    tracking: String(formData.get("tracking") ?? "").trim(),
    ingreso: numero(formData.get("ingreso")),
    costeReal: numero(formData.get("costeReal")),
    notas: String(formData.get("notas") ?? "").trim(),
  };
}

export async function crearPedido(formData: FormData) {
  const datos = datosPedido(formData);
  if (!datos.numeroPedido) return;

  const yaExiste = await prisma.pedido.findUnique({
    where: { numeroPedido: datos.numeroPedido },
  });
  if (yaExiste) {
    redirect(`/pedidos?duplicado=${encodeURIComponent(datos.numeroPedido)}`);
  }

  await prisma.pedido.create({ data: datos });
  refrescar();
}

export async function actualizarPedido(formData: FormData) {
  const datos = datosPedido(formData);
  const id = Number(formData.get("id"));
  if (!datos.numeroPedido) return;

  const otro = await prisma.pedido.findUnique({
    where: { numeroPedido: datos.numeroPedido },
  });
  if (otro && otro.id !== id) {
    redirect(`/pedidos?duplicado=${encodeURIComponent(datos.numeroPedido)}`);
  }

  await prisma.pedido.update({ where: { id }, data: datos });
  refrescar();
}

export async function avanzarPedido(formData: FormData) {
  await prisma.pedido.update({
    where: { id: Number(formData.get("id")) },
    data: { estadoFlujo: String(formData.get("estadoFlujo")) },
  });
  refrescar();
}

export async function borrarPedido(formData: FormData) {
  await prisma.pedido.delete({ where: { id: Number(formData.get("id")) } });
  refrescar();
}
