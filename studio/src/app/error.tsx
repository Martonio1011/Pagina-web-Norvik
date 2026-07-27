'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui';

/**
 * The last line of defence.
 *
 * Shows what actually broke rather than "something went wrong", because the
 * person reading it is the same person who can fix the .env or the config
 * file that caused it.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-10">
      <ErrorState
        title="Esta pantalla no se ha podido cargar"
        detail={error.message}
        action={
          <button
            type="button"
            onClick={reset}
            className="border border-[var(--color-ink)] px-4 py-2 text-sm hover:bg-[var(--color-surface-sunk)]"
          >
            Reintentar
          </button>
        }
      />
    </div>
  );
}
