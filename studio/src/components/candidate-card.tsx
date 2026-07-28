'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { decide } from '@/app/candidates/actions';
import { formatCents, formatPercent } from '@/domain/money';
import type { CandidateEvaluation } from '@/domain/candidate';
import type { TrendsiProductFacts } from '@/domain/candidate';
import { Badge } from './ui';
import { CreateDraftButton } from './create-draft-button';
import { ScoreBreakdownView } from './score-breakdown';

const VERDICT_TONE: Record<string, 'good' | 'warn' | 'bad' | 'neutral'> = {
  PROMISING: 'good',
  REVIEW: 'warn',
  WEAK: 'bad',
  ALREADY_STOCKED: 'neutral',
  EXCLUDED: 'bad',
};

const VERDICT_LABEL: Record<string, string> = {
  PROMISING: 'Prometedor',
  REVIEW: 'Míralo',
  WEAK: 'Flojo',
  ALREADY_STOCKED: 'Ya lo tienes',
  EXCLUDED: 'Descartado',
};

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Descartado',
  PARKED: 'Aparcado',
};

/**
 * One candidate, with everything needed to decide about it on the same card:
 * the photo, the money, why it scored what it scored, and the buttons.
 *
 * The score breakdown is collapsed by default — the queue is for deciding
 * quickly, and the full reasoning is one click away for the times it matters.
 */
export function CandidateCard({
  facts,
  evaluation,
  status,
}: {
  facts: TrendsiProductFacts;
  evaluation: CandidateEvaluation;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [reason, setReason] = useState('');

  function act(action: string): void {
    startTransition(async () => {
      const response = await decide({
        trendsiProductId: facts.productId,
        action,
        reason,
      });
      setResult(response);
      if (response.ok && response.status) setCurrentStatus(response.status);
      if (response.ok) setReason('');
    });
  }

  const economics = evaluation.economics;
  const decided = currentStatus !== 'NEW';

  return (
    <li className="card flex flex-col gap-4 p-4 sm:flex-row">
      <div className="relative aspect-[3/4] w-full shrink-0 overflow-hidden bg-[var(--color-surface-sunk)] sm:w-40">
        {facts.imageUrl ? (
          <Image src={facts.imageUrl} alt={facts.title} fill sizes="160px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[var(--color-ink-muted)]">
            Sin imagen
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base leading-snug">{facts.title}</h2>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
              {evaluation.section?.label ?? 'Sin sección'} · {facts.shipFrom === 'USA' ? 'Envío desde EE. UU.' : 'Envío desde el extranjero'} · {facts.totalStock} uds
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {decided ? (
              <Badge tone={currentStatus === 'APPROVED' ? 'good' : 'neutral'}>
                {STATUS_LABEL[currentStatus] ?? currentStatus}
              </Badge>
            ) : null}
            <Badge tone={VERDICT_TONE[evaluation.verdict] ?? 'neutral'}>
              {VERDICT_LABEL[evaluation.verdict] ?? evaluation.verdict}
            </Badge>
            {evaluation.score.total !== null ? (
              <span className="font-[family-name:var(--font-display)] text-2xl">
                {evaluation.score.total}
                <span className="text-sm text-[var(--color-ink-muted)]">/100</span>
              </span>
            ) : null}
          </div>
        </div>

        <p className="text-sm text-[var(--color-ink-soft)]">{evaluation.verdictReason}</p>

        {economics ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-[var(--color-ink-muted)]">Coste + envío</dt>
              <dd className="mt-0.5 tabular-nums">{formatCents(economics.landedCostCents)}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-muted)]">PVP sugerido</dt>
              <dd className="mt-0.5 tabular-nums">{formatCents(economics.suggestedRetailCents)}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-muted)]">Margen bruto</dt>
              <dd className="mt-0.5 tabular-nums">
                {formatCents(economics.grossMarginCents)}{' '}
                <span className="text-[var(--color-ink-muted)]">
                  ({formatPercent(economics.grossMarginPct, 0)})
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-muted)]">Margen neto</dt>
              <dd className="mt-0.5 tabular-nums">
                {formatCents(economics.netMarginCents)}{' '}
                <span className="text-[var(--color-ink-muted)]">
                  ({formatPercent(economics.netMarginPct, 0)})
                </span>
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-xs text-[var(--color-terracotta)]">{evaluation.economicsError}</p>
        )}

        {evaluation.duplicates.length > 0 ? (
          <div className="border-l-2 border-l-[var(--color-terracotta)] pl-3 text-xs">
            <p className="text-[var(--color-ink-soft)]">
              {evaluation.alreadyInStore ? 'Ya lo tienes:' : 'Puede que ya lo tengas:'}
            </p>
            <ul className="mt-1 space-y-0.5">
              {evaluation.duplicates.map((duplicate) => (
                <li key={duplicate.shopifyProductId} className="text-[var(--color-ink-muted)]">
                  {duplicate.title}
                  {duplicate.needsConfirmation
                    ? ` — coincidencia por título al ${(duplicate.confidence * 100).toFixed(0)}%, confírmalo`
                    : ' — coincidencia exacta por SKU'}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={facts.detailUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[var(--color-sage)] hover:underline"
          >
            Ver en Trendsi →
          </a>
          <button
            type="button"
            onClick={() => setShowBreakdown((open) => !open)}
            aria-expanded={showBreakdown}
            className="text-xs text-[var(--color-ink-soft)] hover:underline"
          >
            {showBreakdown ? 'Ocultar el desglose' : 'Ver de dónde sale el score'}
          </button>
        </div>

        {showBreakdown ? (
          <div className="border-t border-[var(--color-line)] pt-4">
            <ScoreBreakdownView breakdown={evaluation.score} />
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-[var(--color-line)] pt-3">
          <input
            aria-label={`Motivo para ${facts.title}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Motivo (opcional)"
            className="min-w-0 flex-1 border border-[var(--color-line)] bg-transparent px-2.5 py-1.5 text-xs"
          />

          {decided ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => act('REOPEN')}
                className="border border-[var(--color-line)] px-3 py-1.5 text-xs hover:bg-[var(--color-surface-sunk)] disabled:opacity-50"
              >
                Volver a la cola
              </button>

              {currentStatus === 'APPROVED' && economics ? (
                <CreateDraftButton
                  trendsiProductId={facts.productId}
                  title={facts.title}
                  priceLabel={formatCents(economics.suggestedRetailCents)}
                />
              ) : null}
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => act('APPROVE')}
                className="border border-[var(--color-sage)] bg-[var(--color-sage)] px-3 py-1.5 text-xs text-[var(--color-canvas)] hover:opacity-85 disabled:opacity-50"
              >
                Aprobar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => act('PARK')}
                className="border border-[var(--color-line)] px-3 py-1.5 text-xs hover:bg-[var(--color-surface-sunk)] disabled:opacity-50"
              >
                Aparcar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => act('REJECT')}
                className="border border-[var(--color-line)] px-3 py-1.5 text-xs text-[var(--color-wine)] hover:bg-[var(--color-surface-sunk)] disabled:opacity-50"
              >
                Descartar
              </button>
            </>
          )}

          {result ? (
            <span
              role="status"
              className={`text-xs ${result.ok ? 'text-[var(--color-sage)]' : 'text-[var(--color-wine)]'}`}
            >
              {result.message}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
