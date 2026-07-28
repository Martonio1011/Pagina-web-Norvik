import { countQueue, getDecisionQueue } from '@/server/candidates';
import { hasStoredSession } from '@/ingest/trendsi/session';
import { EmptyState, PageHeader, StatCard } from '@/components/ui';
import { CandidateCard } from '@/components/candidate-card';

export const dynamic = 'force-dynamic';

/**
 * The decision queue.
 *
 * Ranked by brand fit first and margin second, because the brief is explicit
 * that fit outranks margin and a queue sorted by money would quietly invert
 * that every single day.
 *
 * Every evaluation on this page is recomputed from the stored supplier facts
 * on each load rather than read back from a saved score, so editing a price
 * band or a term list in `config/` changes what you see on the next refresh.
 */
export default async function CandidatesPage() {
  const queue = await getDecisionQueue();
  const counts = countQueue(queue);
  const connected = hasStoredSession();

  if (queue.length === 0) {
    return (
      <>
        <PageHeader title="Cola de decisión" />
        <EmptyState
          title="Todavía no hay candidatos"
          description={
            connected
              ? 'La sesión de Trendsi está guardada, pero aún no se ha leído ningún producto. Ejecuta "Trendsi - 2 Capturar" para traer resultados.'
              : 'Primero hay que conectar con Trendsi: doble clic en "Trendsi - 1 Conectar", entra con tu email y contraseña, y después ejecuta "Trendsi - 2 Capturar".'
          }
        />
      </>
    );
  }

  const pending = queue.filter((entry) => entry.status === 'NEW');
  const decided = queue.filter((entry) => entry.status !== 'NEW');

  return (
    <>
      <PageHeader
        title="Cola de decisión"
        description="Ordenada por encaje de marca primero y margen después. El encaje manda sobre el margen."
        actions={
          counts.approved > 0 ? (
            <div className="flex items-center gap-2">
              <a
                href="/api/export"
                className="border border-[var(--color-ink)] bg-[var(--color-ink)] px-4 py-2 text-sm text-[var(--color-canvas)] hover:opacity-85"
              >
                Descargar XLSX
              </a>
              <a
                href="/api/export?format=csv"
                className="border border-[var(--color-line)] px-4 py-2 text-sm hover:bg-[var(--color-surface-sunk)]"
              >
                CSV
              </a>
            </div>
          ) : undefined
        }
      />

      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Por decidir" value={counts.pending} />
        <StatCard label="Aprobados" value={counts.approved} tone="good" />
        <StatCard label="Aparcados" value={counts.parked} />
        <StatCard label="Descartados" value={counts.rejected} />
      </div>

      {pending.length > 0 ? (
        <ul aria-label="Candidatos por decidir" className="mb-14 space-y-4">
          {pending.map((entry) => (
            <CandidateCard
              key={entry.facts.productId}
              facts={entry.facts}
              evaluation={entry.evaluation}
              status={entry.status}
            />
          ))}
        </ul>
      ) : (
        <div className="mb-14">
          <EmptyState
            title="No queda nada por decidir"
            description="Has revisado todos los candidatos. Cuando se ejecute una búsqueda nueva aparecerán aquí."
          />
        </div>
      )}

      {decided.length > 0 ? (
        <>
          <h2 className="mb-4 text-xl">Ya decididos</h2>
          <ul aria-label="Candidatos ya decididos" className="space-y-4 opacity-75">
            {decided.map((entry) => (
              <CandidateCard
                key={entry.facts.productId}
                facts={entry.facts}
                evaluation={entry.evaluation}
                status={entry.status}
              />
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}
