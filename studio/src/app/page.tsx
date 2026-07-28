import Link from 'next/link';
import { getShopifyEnv } from '@/env';
import { getCatalogOverview } from '@/server/catalog';
import { getAlerts } from '@/server/alerts';
import { formatCents } from '@/domain/money';
import { Badge, EmptyState, PageHeader, Section, StatCard } from '@/components/ui';
import { SyncButton } from '@/components/sync-button';

export const dynamic = 'force-dynamic';

/**
 * The dashboard.
 *
 * Reads only what is in the local database. Before the first sync it says so
 * plainly and offers the one action that fixes it, rather than showing zeroes
 * that look like real measurements of an empty store.
 */
export default async function DashboardPage() {
  const shopify = getShopifyEnv();
  const overview = await getCatalogOverview();
  const openAlerts = await getAlerts('OPEN');

  if (overview.totalProducts === 0) {
    return (
      <>
        <PageHeader
          title="Panel"
          description="Todavía no hay nada sincronizado."
          actions={shopify.ok ? <SyncButton /> : undefined}
        />
        {shopify.ok ? (
          <EmptyState
            title="Sin datos todavía"
            description="La base de datos está vacía. Pulsa «Sincronizar con Shopify» para traer tu catálogo real: productos, variantes, precios, inventario y colecciones."
          />
        ) : (
          <EmptyState
            title="Conecta tu tienda"
            description={`Falta configuración de Shopify en el archivo .env:\n\n${shopify.problems}\n\nCopia .env.example a .env, rellena esos valores y recarga esta página.`}
          />
        )}
      </>
    );
  }

  const critical = overview.findings.filter((finding) => finding.severity === 'CRITICAL');
  const warnings = overview.findings.filter((finding) => finding.severity === 'WARNING');
  const info = overview.findings.filter((finding) => finding.severity === 'INFO');
  const untraceable = overview.trendsiProducts - overview.traceableProducts;

  return (
    <>
      <PageHeader
        title="Panel"
        description="Estado de tu catálogo hoy, leído de tu tienda real."
        actions={<SyncButton />}
      />

      <Section title="Catálogo">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Productos"
            value={overview.totalProducts}
            hint={`${overview.totalVariants} variantes en total`}
          />
          <StatCard
            label="Publicados"
            value={overview.activeProducts}
            hint={`${overview.draftProducts} en borrador`}
            tone="good"
          />
          <StatCard
            label="Avisos abiertos"
            value={overview.findings.length}
            hint={`${critical.length} críticos · ${warnings.length} de atención · ${info.length} informativos`}
            tone={critical.length > 0 ? 'bad' : warnings.length > 0 ? 'warn' : 'good'}
          />
          <StatCard
            label="Trazables a Trendsi"
            value={`${overview.traceableProducts}/${overview.trendsiProducts}`}
            hint={
              untraceable > 0 ? `${untraceable} sin SKU reconocible` : 'Todos con SKU reconocible'
            }
            tone={untraceable > 0 ? 'warn' : 'good'}
          />
        </div>
      </Section>

      <Section
        title="Huecos por sección"
        description="Cuántos productos tiene hoy cada sección de la tienda y en qué horquilla de precio debería moverse."
      >
        <ul aria-label="Cobertura por sección" className="card divide-y divide-[var(--color-line)]">
          {overview.coverage.map((section) => (
            <li
              key={section.sectionKey}
              className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-40">
                <p className="text-sm">{section.label}</p>
                <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                  {formatCents(section.priceBandCents.min)} –{' '}
                  {formatCents(section.priceBandCents.max)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {!section.hasConfiguredCollections ? (
                  <Badge tone="warn">Sin colección configurada</Badge>
                ) : section.missingCollections.length > 0 ? (
                  <Badge tone="warn">
                    Falta en Shopify: {section.missingCollections.join(', ')}
                  </Badge>
                ) : null}
                {section.productCount === 0 ? (
                  <Badge tone="bad">Vacía</Badge>
                ) : (
                  <Badge tone={section.productCount < 5 ? 'warn' : 'good'}>
                    {section.productCount} producto{section.productCount === 1 ? '' : 's'}
                    {section.activeCount !== section.productCount
                      ? ` · ${section.activeCount} publicados`
                      : ''}
                  </Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
          «Sin colección configurada» significa que esa sección todavía no apunta a ninguna
          colección de Shopify, así que se cuenta a cero: crea la colección en Shopify y añádela en{' '}
          <code className="text-[var(--color-ink-soft)]">config/sections.yaml</code>, donde también
          se editan las horquillas de precio.
        </p>
      </Section>

      {openAlerts.length > 0 ? (
        <Section
          title="Alertas abiertas"
          description="Rotura de stock, subidas de coste y precios fuera de sitio."
          actions={
            <Link href="/alerts" className="text-sm text-[var(--color-sage)] hover:underline">
              Ver todas →
            </Link>
          }
        >
          <ul className="card divide-y divide-[var(--color-line)]">
            {openAlerts.slice(0, 4).map((alert) => (
              <li key={alert.id} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm">{alert.title}</p>
                  <Badge
                    tone={
                      alert.severity === 'CRITICAL'
                        ? 'bad'
                        : alert.severity === 'WARNING'
                          ? 'warn'
                          : 'info'
                    }
                  >
                    {alert.severity === 'CRITICAL'
                      ? 'Crítico'
                      : alert.severity === 'WARNING'
                        ? 'Atención'
                        : 'Info'}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{alert.body}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section
        title="Qué requiere tu atención"
        description="Los avisos abiertos sobre el catálogo que ya tienes."
        actions={
          <Link href="/audit" className="text-sm text-[var(--color-sage)] hover:underline">
            Ver la auditoría completa →
          </Link>
        }
      >
        {overview.findings.length === 0 ? (
          <EmptyState
            title="Nada que corregir"
            description="Ningún producto está fuera de su horquilla de precio, sin stock estando publicado, ni fuera de colección."
          />
        ) : (
          <ul className="card divide-y divide-[var(--color-line)]">
            {overview.findings.slice(0, 6).map((finding) => (
              <li key={`${finding.productId}-${finding.kind}`} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm">{finding.productTitle}</p>
                  <Badge
                    tone={
                      finding.severity === 'CRITICAL'
                        ? 'bad'
                        : finding.severity === 'WARNING'
                          ? 'warn'
                          : 'info'
                    }
                  >
                    {finding.severity === 'CRITICAL'
                      ? 'Crítico'
                      : finding.severity === 'WARNING'
                        ? 'Atención'
                        : 'Info'}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{finding.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Última sincronización">
        {overview.lastSync ? (
          <div className="card flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm">
                {overview.lastSync.startedAt.toLocaleString('es-ES')} ·{' '}
                {overview.lastSync.itemsSeen} productos leídos
              </p>
              <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                {overview.lastSync.durationMs !== null
                  ? `${(overview.lastSync.durationMs / 1000).toFixed(1)} s`
                  : 'en curso'}
                {overview.lastSync.errorCount > 0
                  ? ` · ${overview.lastSync.errorCount} error(es)`
                  : ' · sin errores'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                tone={
                  overview.lastSync.status === 'OK'
                    ? 'good'
                    : overview.lastSync.status === 'PARTIAL'
                      ? 'warn'
                      : 'bad'
                }
              >
                {overview.lastSync.status}
              </Badge>
              <Link
                href={`/runs/${overview.lastSync.id}`}
                className="text-sm text-[var(--color-sage)] hover:underline"
              >
                Ver traza →
              </Link>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Sin ejecuciones registradas"
            description="Los datos están en la base pero no hay ninguna ejecución guardada. Sincroniza para dejar traza."
          />
        )}
      </Section>
    </>
  );
}
