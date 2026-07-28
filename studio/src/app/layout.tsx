import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import './globals.css';

export const metadata: Metadata = {
  title: 'Norvik Sourcing Studio',
  description: 'Busca, puntúa y prioriza producto de Trendsi para la tienda Norvik.',
};

const NAV = [
  { href: '/', label: 'Panel' },
  { href: '/catalog', label: 'Catálogo' },
  { href: '/candidates', label: 'Candidatos' },
  { href: '/audit', label: 'Auditoría' },
  { href: '/brand', label: 'Encaje de marca' },
  { href: '/runs', label: 'Ejecuciones' },
];

/**
 * The application shell.
 *
 * The theme is applied before the first paint by the inline script below —
 * without it the page flashes light before switching to dark, which looks
 * broken every single time the app is opened.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('norvik-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen">
        <a href="#main" className="skip-link">
          Saltar al contenido
        </a>

        <header className="border-b border-[var(--color-line)]">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-6 py-5 md:px-10">
            <div className="flex items-baseline gap-3">
              <Link
                href="/"
                className="font-[family-name:var(--font-display)] text-lg tracking-[0.18em] uppercase"
              >
                Norvik
              </Link>
              <span className="text-xs tracking-[0.14em] text-[var(--color-ink-muted)] uppercase">
                Sourcing Studio
              </span>
            </div>

            <nav aria-label="Principal" className="order-3 w-full md:order-2 md:w-auto">
              <ul className="flex flex-wrap gap-6">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="order-2 md:order-3">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto max-w-[1400px] px-6 py-10 md:px-10 md:py-14">
          {children}
        </main>

        <footer className="border-t border-[var(--color-line)] py-8">
          <div className="mx-auto max-w-[1400px] px-6 text-xs text-[var(--color-ink-muted)] md:px-10">
            Datos locales. Nada sale de este ordenador salvo las llamadas a Shopify y a los
            proveedores que tú lanzas.
          </div>
        </footer>
      </body>
    </html>
  );
}
