'use client';

import { useState, useTransition } from 'react';
import {
  addSearchTerm,
  deleteSearchTerm,
  toggleSearchTerm,
  updateSchedule,
} from '@/app/searches/actions';
import type { SavedSearchView } from '@/server/searches';
import { Badge } from './ui';

const SCHEDULE_LABEL: Record<string, string> = {
  MANUAL: 'Solo cuando yo lo pida',
  DAILY: 'Cada día',
  WEEKLY: 'Cada semana',
};

/**
 * One section's search terms, editable in place.
 *
 * A term longer than Trendsi's four-token limit is saved exactly as typed and
 * flagged, showing what will actually be sent. Silently truncating someone's
 * words would be worse than telling them.
 */
export function SavedSearchCard({ search }: { search: SavedSearchView }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [newTerm, setNewTerm] = useState('');

  function run(action: () => Promise<{ ok: boolean; message: string }>): void {
    startTransition(async () => {
      const result = await action();
      setMessage({ ok: result.ok, text: result.message });
    });
  }

  const activeTerms = search.terms.filter((term) => term.enabled).length;

  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg">{search.sectionLabel}</h2>
          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
            {activeTerms} de {search.terms.length} términos activos
            {search.lastRunAt
              ? ` · última ejecución ${search.lastRunAt.toLocaleDateString('es-ES')}`
              : ' · nunca ejecutada'}
          </p>
        </div>

        <label className="flex items-center gap-2 text-xs">
          <span className="text-[var(--color-ink-muted)]">Buscar</span>
          <select
            value={search.enabled ? search.schedule : 'OFF'}
            disabled={pending}
            onChange={(event) => {
              const value = event.target.value;
              run(() =>
                updateSchedule(
                  search.id,
                  value === 'OFF' ? 'MANUAL' : value,
                  value !== 'OFF',
                ),
              );
            }}
            className="border border-[var(--color-line)] bg-transparent px-2 py-1 text-xs"
            aria-label={`Frecuencia de ${search.sectionLabel}`}
          >
            <option value="WEEKLY">{SCHEDULE_LABEL.WEEKLY}</option>
            <option value="DAILY">{SCHEDULE_LABEL.DAILY}</option>
            <option value="MANUAL">{SCHEDULE_LABEL.MANUAL}</option>
            <option value="OFF">Desactivada</option>
          </select>
        </label>
      </div>

      <ul className="mt-4 space-y-1.5">
        {search.terms.map((term) => (
          <li key={term.id} className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={term.enabled}
              disabled={pending}
              onChange={(event) => run(() => toggleSearchTerm(term.id, event.target.checked))}
              aria-label={`Usar el término ${term.term}`}
              className="accent-[var(--color-sage)]"
            />
            <span className={term.enabled ? '' : 'text-[var(--color-ink-muted)] line-through'}>
              {term.term}
            </span>

            {term.tooLong ? (
              <Badge tone="warn">
                {term.tokenCount} palabras · se buscará «{term.effectiveTerm}»
              </Badge>
            ) : null}

            {term.lastResults !== null ? (
              <Badge tone={term.lastResults === 0 ? 'bad' : 'neutral'}>
                {term.lastResults} resultados
              </Badge>
            ) : null}

            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => deleteSearchTerm(term.id))}
              className="ml-auto text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-wine)] hover:underline disabled:opacity-50"
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>

      <form
        className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-line)] pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (newTerm.trim() === '') return;
          const term = newTerm;
          setNewTerm('');
          run(() => addSearchTerm(search.id, term));
        }}
      >
        <input
          value={newTerm}
          onChange={(event) => setNewTerm(event.target.value)}
          placeholder="Añadir un término, corto"
          aria-label={`Nuevo término para ${search.sectionLabel}`}
          className="min-w-0 flex-1 border border-[var(--color-line)] bg-transparent px-2.5 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={pending || newTerm.trim() === ''}
          className="border border-[var(--color-line)] px-3 py-1.5 text-xs hover:bg-[var(--color-surface-sunk)] disabled:opacity-50"
        >
          Añadir
        </button>
      </form>

      {message ? (
        <p
          role="status"
          className={`mt-2 text-xs ${message.ok ? 'text-[var(--color-sage)]' : 'text-[var(--color-wine)]'}`}
        >
          {message.text}
        </p>
      ) : null}
    </li>
  );
}
