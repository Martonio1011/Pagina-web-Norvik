'use client';

import { useState, useTransition } from 'react';
import { seedSearches } from '@/app/searches/actions';

/**
 * Creates the default saved searches from the config file.
 *
 * Safe to press twice: it only fills in sections that have no search yet and
 * never overwrites terms that have been edited by hand.
 */
export function SeedSearchesButton({ label }: { label: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await seedSearches();
            setMessage({ ok: result.ok, text: result.message });
          })
        }
        className="border border-[var(--color-ink)] bg-[var(--color-ink)] px-4 py-2 text-sm text-[var(--color-canvas)] hover:opacity-85 disabled:opacity-60"
      >
        {pending ? 'Creando…' : label}
      </button>

      {message ? (
        <p
          role="status"
          className={`text-xs ${message.ok ? 'text-[var(--color-sage)]' : 'text-[var(--color-wine)]'}`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
