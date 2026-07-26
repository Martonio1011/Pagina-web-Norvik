"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ENLACES = [
  { href: "/", etiqueta: "Panel", icono: "◉" },
  { href: "/checklist", etiqueta: "Checklist", icono: "☑" },
  { href: "/catalogo", etiqueta: "Catálogo", icono: "◫" },
  { href: "/pedidos", etiqueta: "Pedidos", icono: "▤" },
  { href: "/marketing", etiqueta: "Marketing", icono: "◈" },
  { href: "/finanzas", etiqueta: "Finanzas", icono: "€" },
  { href: "/ajustes", etiqueta: "Ajustes", icono: "⚙" },
];

export function Navegacion() {
  const ruta = usePathname();
  const activo = (href: string) =>
    href === "/" ? ruta === "/" : ruta.startsWith(href);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-[var(--color-borde)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="shrink-0">
            <span className="block text-sm font-semibold tracking-[0.2em] uppercase">
              Norvik
            </span>
            <span className="block text-[11px] text-[var(--color-tinta-suave)]">
              Control Center
            </span>
          </Link>
          <nav className="hidden flex-1 items-center justify-end gap-1 sm:flex">
            {ENLACES.map((enlace) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  activo(enlace.href)
                    ? "bg-[var(--color-marca-suave)] font-medium text-[var(--color-marca)]"
                    : "text-[var(--color-tinta-suave)] hover:bg-[var(--color-lienzo)]"
                }`}
              >
                {enlace.etiqueta}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-borde)] bg-white sm:hidden">
        <div className="grid grid-cols-7">
          {ENLACES.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${
                activo(enlace.href)
                  ? "text-[var(--color-marca)]"
                  : "text-[var(--color-tinta-suave)]"
              }`}
            >
              <span aria-hidden className="text-base leading-none">
                {enlace.icono}
              </span>
              {enlace.etiqueta}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
