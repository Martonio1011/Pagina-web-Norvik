import Link from 'next/link';
import { getRuns } from '@/server/catalog';
import { Badge, EmptyState, PageHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, 'good' | 'warn' | 'bad' | 'info'> = {
  OK: 'good',
  RUNNING: 'info',
  PARTIAL: 'warn',
  BLOCKED: 'warn',
  SESSION_EXPIRED: 'warn',
  FAILED: 'bad',
};

/**
 * Every ingestion run ever executed, newest first.
 *
 * This is the app's memory of what it did and what went wrong doing it. A run
 * that saw errors never shows as OK.
 */
export default async function RunsPage() {
  const runs = await getRuns();

  if (runs.length === 0) {
    return (
      <>
        <PageHeader title="Ejecuciones" />
        <EmptyState
          title="Aún no se ha ejecutado nada"
          description="Cada sincronización con Shopify o rastreo de proveedor deja aquí su traza: qué se buscó, cuánto tardó, cuántos resultados y qué falló."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Ejecuciones"
        description="Traza completa de cada sincronización y rastreo, con sus errores."
      />

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Historial de ejecuciones de ingesta</caption>
          <thead>
            <tr className="border-b border-[var(--color-line)] text-left text-xs tracking-wider text-[var(--color-ink-muted)] uppercase">
              <th scope="col" className="px-5 py-3 font-normal">
                Fecha
              </th>
              <th scope="col" className="px-5 py-3 font-normal">
                Origen
              </th>
              <th scope="col" className="px-5 py-3 font-normal">
                Estado
              </th>
              <th scope="col" className="px-5 py-3 text-right font-normal">
                Vistos
              </th>
              <th scope="col" className="px-5 py-3 text-right font-normal">
                Nuevos
              </th>
              <th scope="col" className="px-5 py-3 text-right font-normal">
                Errores
              </th>
              <th scope="col" className="px-5 py-3 text-right font-normal">
                Duración
              </th>
              <th scope="col" className="px-5 py-3">
                <span className="sr-only">Detalle</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-line)]">
            {runs.map((run) => (
              <tr key={run.id}>
                <td className="px-5 py-3 whitespace-nowrap">
                  {run.startedAt.toLocaleString('es-ES')}
                </td>
                <td className="px-5 py-3">
                  {run.source}
                  {run.dryRun ? (
                    <span className="ml-2 text-xs text-[var(--color-ink-muted)]">dry-run</span>
                  ) : null}
                </td>
                <td className="px-5 py-3">
                  <Badge tone={STATUS_TONE[run.status] ?? 'info'}>{run.status}</Badge>
                </td>
                <td className="px-5 py-3 text-right tabular-nums">{run.itemsSeen}</td>
                <td className="px-5 py-3 text-right tabular-nums">{run.itemsNew}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {run.errorCount > 0 ? (
                    <span className="text-[var(--color-wine)]">{run.errorCount}</span>
                  ) : (
                    '0'
                  )}
                </td>
                <td className="px-5 py-3 text-right tabular-nums whitespace-nowrap">
                  {run.durationMs !== null ? `${(run.durationMs / 1000).toFixed(1)} s` : '—'}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/runs/${run.id}`}
                    className="text-[var(--color-sage)] hover:underline"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
