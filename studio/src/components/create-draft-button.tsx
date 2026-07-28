'use client';

import { useState, useTransition } from 'react';
import { createDraftForCandidate, type DraftResult } from '@/app/candidates/draft-actions';

/**
 * Creating the product in Shopify — the one button in this app that changes
 * something outside it.
 *
 * It takes two clicks on purpose. The first turns into a plain question naming
 * the product; the second sends it. Nothing about this flow can publish: the
 * product is created as a draft and the confirmation says so, so what is being
 * agreed to is exactly what happens.
 */
export function CreateDraftButton({
  trendsiProductId,
  title,
  priceLabel,
}: {
  trendsiProductId: string;
  title: string;
  priceLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<DraftResult | null>(null);

  if (result?.ok) {
    return (
      <div className="w-full border-l-2 border-l-[var(--color-sage)] pl-3 text-xs">
        <p className="text-[var(--color-sage)]">{result.message}</p>
        {result.warnings && result.warnings.length > 0 ? (
          <ul className="mt-1 space-y-0.5">
            {result.warnings.map((warning) => (
              <li key={warning} className="text-[var(--color-terracotta)]">
                {warning}
              </li>
            ))}
          </ul>
        ) : null}
        {result.adminUrl ? (
          <a
            href={result.adminUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-[var(--color-sage)] hover:underline"
          >
            Abrir el borrador en Shopify →
          </a>
        ) : null}
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="w-full border-l-2 border-l-[var(--color-terracotta)] pl-3">
        <p className="text-xs leading-relaxed">
          Se creará <strong>{title}</strong> en tu tienda a {priceLabel},{' '}
          <strong>como borrador</strong>. No se publica: tendrás que revisarlo y publicarlo tú desde
          Shopify.
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const response = await createDraftForCandidate({
                  trendsiProductId,
                  confirmed: true,
                });
                setResult(response);
                if (!response.ok) setConfirming(false);
              })
            }
            className="border border-[var(--color-ink)] bg-[var(--color-ink)] px-3 py-1.5 text-xs text-[var(--color-canvas)] hover:opacity-85 disabled:opacity-50"
          >
            {pending ? 'Creando…' : 'Sí, crear el borrador'}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(false)}
            className="border border-[var(--color-line)] px-3 py-1.5 text-xs hover:bg-[var(--color-surface-sunk)] disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="border border-[var(--color-line)] px-3 py-1.5 text-xs hover:bg-[var(--color-surface-sunk)]"
      >
        Crear borrador en Shopify
      </button>
      {result && !result.ok ? (
        <span role="status" className="text-xs text-[var(--color-wine)]">
          {result.message}
        </span>
      ) : null}
    </div>
  );
}
