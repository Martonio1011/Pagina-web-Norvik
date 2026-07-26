import type { Metadata } from "next";
import "./globals.css";
import { Navegacion } from "@/components/navegacion";

export const metadata: Metadata = {
  title: "Norvik Control Center",
  description: "Centro de control de la tienda Norvik",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Navegacion />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-24 sm:px-6 sm:pb-10">
          {children}
        </main>
      </body>
    </html>
  );
}
