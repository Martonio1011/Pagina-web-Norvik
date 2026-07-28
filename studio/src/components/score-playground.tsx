'use client';

import { useState, useTransition } from 'react';
import { scoreTitle } from '@/app/brand/actions';
import type { ScoreBreakdown, ScoreGroup } from '@/domain/scoring';
import { ScoreBreakdownView } from './score-breakdown';

/**
 * Try a product title against the brand rules and see the score it would get.
 *
 * Exists so the rules can be understood and tuned by looking at results,
 * rather than by reading a YAML file and hoping.
 */
export function ScorePlayground({
  initialTitle,
  initialResult,
}: {
  initialTitle: string;
  initialResult: ScoreBreakdown;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState('');
  const [colors, setColors] = useState('');
  const [result, setResult] = useState<ScoreBreakdown>(initialResult);
  const [pending, startTransition] = useTransition();

  function run(): void {
    startTransition(async () => {
      setResult(await scoreTitle({ title, description, colors }));
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        className="card space-y-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          run();
        }}
      >
        <div>
          <label htmlFor="playground-title" className="mb-1.5 block text-sm">
            Título del producto
          </label>
          <input
            id="playground-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full border border-[var(--color-line)] bg-transparent px-3 py-2 text-sm"
            placeholder="Satin Halter Maxi Dress"
          />
        </div>

        <div>
          <label htmlFor="playground-description" className="mb-1.5 block text-sm">
            Descripción <span className="text-[var(--color-ink-muted)]">(opcional)</span>
          </label>
          <textarea
            id="playground-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="w-full border border-[var(--color-line)] bg-transparent px-3 py-2 text-sm"
            placeholder="An effortless, timeless piece for golden hour."
          />
        </div>

        <div>
          <label htmlFor="playground-colors" className="mb-1.5 block text-sm">
            Colores <span className="text-[var(--color-ink-muted)]">(separados por comas)</span>
          </label>
          <input
            id="playground-colors"
            value={colors}
            onChange={(event) => setColors(event.target.value)}
            className="w-full border border-[var(--color-line)] bg-transparent px-3 py-2 text-sm"
            placeholder="Chocolate, Sage"
          />
        </div>

        <button
          type="submit"
          disabled={pending || title.trim() === ''}
          className="border border-[var(--color-ink)] bg-[var(--color-ink)] px-4 py-2 text-sm text-[var(--color-canvas)] transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {pending ? 'Puntuando…' : 'Puntuar'}
        </button>

        <p className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
          Aquí solo se puntúa el encaje de marca. El encaje de precio vale 20 puntos y necesita el
          coste real de Trendsi, que un título escrito a mano no tiene — por eso sale a cero y no se
          da por bueno.
        </p>
      </form>

      <div className="card p-5">
        <ScoreBreakdownView breakdown={result} />
      </div>
    </div>
  );
}

export type { ScoreGroup };
