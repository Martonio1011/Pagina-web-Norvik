import { getCatalogOverview } from '@/server/catalog';
import { Badge, EmptyState, PageHeader, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

const KIND_LABEL: Record<string, string> = {
  PRICE_ABOVE_BAND: 'Precio por encima de la horquilla',
  PRICE_BELOW_BAND: 'Precio por debajo de la horquilla',
  NO_SECTION: 'Sin sección asignable',
  ACTIVE_WITHOUT_STOCK: 'Publicado sin stock',
  NO_COLLECTION: 'Publicado sin colección',
};

const SEVERITY_LABEL: Record<string, string> = {
  CRITICAL: 'Crítico',
  WARNING: 'Atención',
  INFO: 'Info',
};

/**
 * Everything wrong with the catalogue as it stands, grouped by kind.
 *
 * Each finding carries the numbers it was derived from, so a claim like
 * "priced above the band" can be checked without leaving the page.
 */
export default async function AuditPage() {
  const overview = await getCatalogOverview();

  if (overview.totalProducts === 0) {
    return (
      <>
        <PageHeader title="Auditoría" />
        <EmptyState
          title="No hay catálogo que auditar"
          description="Sincroniza primero con Shopify desde el panel."
        />
      </>
    );
  }

  if (overview.findings.length === 0) {
    return (
      <>
        <PageHeader
          title="Auditoría"
          description={`${overview.totalProducts} productos revisados contra las reglas de config/sections.yaml.`}
        />
        <EmptyState
          title="Todo en orden"
          description="Ningún producto está fuera de su horquilla de precio, publicado sin stock ni fuera de colección."
        />
      </>
    );
  }

  const byKind = new Map<string, typeof overview.findings>();
  for (const finding of overview.findings) {
    const bucket = byKind.get(finding.kind);
    if (bucket) bucket.push(finding);
    else byKind.set(finding.kind, [finding]);
  }

  return (
    <>
      <PageHeader
        title="Auditoría"
        description={`${overview.findings.length} avisos sobre ${overview.totalProducts} productos, contrastados con las horquillas de config/sections.yaml.`}
      />

      {[...byKind.entries()].map(([kind, findings]) => (
        <Section
          key={kind}
          title={KIND_LABEL[kind] ?? kind}
          description={`${findings.length} producto(s).`}
        >
          <ul className="card divide-y divide-[var(--color-line)]">
            {findings.map((finding) => (
              <li key={`${finding.productId}-${finding.kind}`} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="text-sm">{finding.productTitle}</p>
                  <div className="flex items-center gap-2">
                    {finding.sectionKey ? <Badge>{finding.sectionKey}</Badge> : null}
                    <Badge
                      tone={
                        finding.severity === 'CRITICAL'
                          ? 'bad'
                          : finding.severity === 'WARNING'
                            ? 'warn'
                            : 'info'
                      }
                    >
                      {SEVERITY_LABEL[finding.severity] ?? finding.severity}
                    </Badge>
                  </div>
                </div>

                <p className="mt-1.5 text-sm text-[var(--color-ink-soft)]">{finding.message}</p>

                {Object.keys(finding.evidence).length > 0 ? (
                  <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-xs text-[var(--color-ink-muted)]">
                    {Object.entries(finding.evidence).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <dt>{key}</dt>
                        <dd className="text-[var(--color-ink-soft)]">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </>
  );
}
