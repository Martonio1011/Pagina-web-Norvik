'use client';

import { useState, useTransition } from 'react';
import { runShopifySync, type ActionResult } from '@/app/actions';

/**
 * Runs the Shopify sync and reports what happened.
 *
 * Three states, all of them visible: idle, working, and a result that stays on
 * screen until the next run. A button that silently does something and then
 * looks idle again is indistinguishable from a button that does nothing.
 */
export function SyncButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setResult(null);
            setResult(await runShopifySync());
          })
        }
        className="border border-[var(--color-ink)] bg-[var(--color-ink)] px-4 py-2 text-sm text-[var(--color-canvas)] transition-opacity hover:opacity-85 disabled:cursor-progress disabled:opacity-60"
      >
        {pending ? 'Sincronizando…' : 'Sincronizar con Shopify'}
      </button>

      {result ? (
        <div
          role="status"
          className={`max-w-md text-right text-xs leading-relaxed ${
            result.ok ? 'text-[var(--color-sage)]' : 'text-[var(--color-wine)]'
          }`}
        >
          <p>{result.message}</p>
          {result.detail ? (
            <pre className="mt-1 text-left whitespace-pre-wrap text-[var(--color-ink-muted)]">
              {result.detail}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
