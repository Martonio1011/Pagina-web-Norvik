import { notFound } from 'next/navigation';
import { getRun } from '@/server/catalog';
import { Badge, EmptyState, PageHeader, StatCard } from '@/components/ui';

export const dynamic = 'force-dynamic';

/**
 * One run in full, including every error it recorded.
 *
 * This screen is the reason the app has no empty catch blocks: everything that
 * fails ends up here, with the stage it failed at and what it was working on.
 */
export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getRun(id);
  if (!result) notFound();

  const { run, errors } = result;

  return (
    <>
      <PageHeader
        title={`Ejecución ${run.source.toLowerCase()}`}
        description={`Iniciada el ${run.startedAt.toLocaleString('es-ES')}${run.dryRun ? ' · dry-run, sin tocar la red' : ''}.`}
        actions={
          <Badge tone={run.status === 'OK' ? 'good' : run.status === 'FAILED' ? 'bad' : 'warn'}>
            {run.status}
          </Badge>
        }
      />

      <div className="mb-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Elementos vistos" value={run.itemsSeen} />
        <StatCard label="Nuevos" value={run.itemsNew} hint={`${run.itemsUpdated} actualizados`} />
        <StatCard
          label="Errores"
          value={run.errorCount}
          tone={run.errorCount > 0 ? 'bad' : 'good'}
        />
        <StatCard
          label="Duración"
          value={run.durationMs !== null ? `${(run.durationMs / 1000).toFixed(1)} s` : '—'}
        />
      </div>

      {run.notes ? <p className="mb-10 text-sm text-[var(--color-ink-soft)]">{run.notes}</p> : null}

      <h2 className="mb-4 text-xl">Errores registrados</h2>
      {errors.length === 0 ? (
        <EmptyState
          title="Ningún error"
          description="La ejecución terminó sin incidencias: todo lo que se leyó se pudo interpretar y guardar."
        />
      ) : (
        <ul className="card divide-y divide-[var(--color-line)]">
          {errors.map((error) => (
            <li key={error.id} className="px-5 py-4">
              <div className="flex flex-wrap items-baseline gap-3">
                <Badge tone="bad">{error.stage}</Badge>
                {error.target ? (
                  <code className="text-xs text-[var(--color-ink-muted)]">{error.target}</code>
                ) : null}
              </div>
              <p className="mt-2 text-sm">{error.message}</p>
              {error.detail ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-[var(--color-ink-muted)]">
                    Detalle técnico
                  </summary>
                  <pre className="mt-2 overflow-x-auto text-xs whitespace-pre-wrap text-[var(--color-ink-muted)]">
                    {error.detail}
                  </pre>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
