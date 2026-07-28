import { getSavedSearches } from '@/server/searches';
import { hasStoredSession } from '@/ingest/trendsi/session';
import { MAX_SEARCH_TOKENS } from '@/ingest/trendsi/page-state';
import { Badge, EmptyState, PageHeader } from '@/components/ui';
import { SavedSearchCard } from '@/components/saved-search-card';
import { SeedSearchesButton } from '@/components/seed-searches-button';

export const dynamic = 'force-dynamic';

/**
 * The search terms, per section, editable here rather than in a config file.
 *
 * The defaults in `config/sections.yaml` are only a starting point: these are
 * the words that decide what the app goes looking for, and they belong to the
 * person who knows what is selling.
 */
export default async function SearchesPage() {
  const searches = await getSavedSearches();
  const connected = hasStoredSession();

  return (
    <>
      <PageHeader
        title="Búsquedas guardadas"
        description={`Los términos con los que la aplicación busca en Trendsi. Cortos: Trendsi exige que aparezcan todas las palabras y no devuelve nada con más de ${MAX_SEARCH_TOKENS}.`}
        actions={searches.length > 0 ? <SeedSearchesButton label="Restaurar las que falten" /> : undefined}
      />

      {!connected ? (
        <div className="card mb-8 border-l-2 border-l-[var(--color-terracotta)] px-5 py-4">
          <p className="text-sm">Todavía no hay sesión de Trendsi guardada.</p>
          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
            Puedes preparar aquí los términos igualmente. Para ejecutarlos hace falta conectar
            primero: doble clic en «Trendsi - 1 Conectar».
          </p>
        </div>
      ) : null}

      {searches.length === 0 ? (
        <EmptyState
          title="Sin búsquedas todavía"
          description="Puedo crear una búsqueda por sección con unos términos de partida, sacados de config/sections.yaml. Después los editas aquí a tu gusto."
          action={<SeedSearchesButton label="Crear las búsquedas de partida" />}
        />
      ) : (
        <>
          <ul aria-label="Búsquedas guardadas" className="space-y-4">
            {searches.map((search) => (
              <SavedSearchCard key={search.id} search={search} />
            ))}
          </ul>

          <p className="mt-6 flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-muted)]">
            <Badge tone="warn">Aviso de longitud</Badge>
            Un término marcado así tiene más de {MAX_SEARCH_TOKENS} palabras. Se guarda tal cual lo
            escribiste, pero a Trendsi se le envía recortado — y ahí se ve exactamente cómo.
          </p>
        </>
      )}
    </>
  );
}
