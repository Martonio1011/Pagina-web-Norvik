import type { ScoreBreakdown, ScoreGroup } from '@/domain/scoring';

/**
 * The score, shown as the sum of its parts.
 *
 * This component is the reason the scoring module returns components rather
 * than a bare number: the total on screen is assembled from the same list that
 * produced it, so what you read is what was calculated. If a product scores
 * oddly, the answer is on this panel, not in the source code.
 */

const GROUP_LABEL: Record<ScoreGroup, string> = {
  MATERIALS: 'Materiales',
  SILHOUETTE: 'Silueta',
  COLOR: 'Color',
  PRICE_FIT: 'Precio',
  VOCABULARY: 'Vocabulario',
};

function toneFor(total: number): { label: string; className: string } {
  if (total >= 75) return { label: 'Encaja muy bien', className: 'text-[var(--color-sage)]' };
  if (total >= 50) return { label: 'Encaja', className: 'text-[var(--color-sage)]' };
  if (total >= 30) return { label: 'Dudoso', className: 'text-[var(--color-terracotta)]' };
  return { label: 'No encaja', className: 'text-[var(--color-wine)]' };
}

export function ScoreBreakdownView({ breakdown }: { breakdown: ScoreBreakdown }) {
  if (breakdown.excluded) {
    return (
      <div>
        <p className="text-xs tracking-[0.12em] text-[var(--color-ink-muted)] uppercase">
          Brand Fit Score
        </p>
        <p className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[var(--color-wine)]">
          Descartado
        </p>
        <p className="mt-3 text-sm text-[var(--color-ink-soft)]">{breakdown.exclusionReason}</p>
        {breakdown.exclusionTerm ? (
          <p className="mt-1.5 text-xs text-[var(--color-ink-muted)]">
            Detectado por la palabra «{breakdown.exclusionTerm}».
          </p>
        ) : null}
        <p className="mt-4 text-xs leading-relaxed text-[var(--color-ink-muted)]">
          Un producto descartado no recibe puntuación. No es que puntúe bajo: es que no va en esta
          tienda, tenga el margen que tenga.
        </p>
      </div>
    );
  }

  const total = breakdown.total ?? 0;
  const tone = toneFor(total);

  return (
    <div>
      <p className="text-xs tracking-[0.12em] text-[var(--color-ink-muted)] uppercase">
        Brand Fit Score
      </p>
      <p className={`mt-3 font-[family-name:var(--font-display)] text-5xl ${tone.className}`}>
        {total}
        <span className="text-2xl text-[var(--color-ink-muted)]">/100</span>
      </p>
      <p className={`mt-1 text-sm ${tone.className}`}>{tone.label}</p>

      <ul className="mt-6 space-y-4">
        {breakdown.groups.map((group) => (
          <li key={group.group}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm">{GROUP_LABEL[group.group]}</span>
              <span className="tabular-nums text-sm text-[var(--color-ink-soft)]">
                {group.points} / {group.weight}
              </span>
            </div>

            <div
              aria-hidden="true"
              className="mt-1.5 h-1 w-full bg-[var(--color-surface-sunk)]"
              role="presentation"
            >
              <div
                className="h-1 bg-[var(--color-sage)]"
                style={{ width: `${group.weight === 0 ? 0 : (group.points / group.weight) * 100}%` }}
              />
            </div>

            {group.components.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {group.components.map((component, index) => (
                  <li
                    key={`${component.label}-${index}`}
                    className="flex items-baseline justify-between gap-3 text-xs"
                  >
                    <span className="text-[var(--color-ink-muted)]">{component.evidence}</span>
                    <span
                      className={`shrink-0 tabular-nums ${
                        component.points >= 0
                          ? 'text-[var(--color-sage)]'
                          : 'text-[var(--color-wine)]'
                      }`}
                    >
                      {component.points > 0 ? '+' : ''}
                      {component.points}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1.5 text-xs text-[var(--color-ink-muted)]">
                Nada de este grupo aparece en la ficha.
              </p>
            )}

            {group.rawPoints !== group.points ? (
              <p className="mt-1.5 text-xs text-[var(--color-ink-muted)]">
                {group.rawPoints > group.weight
                  ? `Sumaba ${group.rawPoints}, limitado al techo del grupo (${group.weight}).`
                  : `Restaba hasta ${group.rawPoints}, el grupo no baja de 0.`}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
