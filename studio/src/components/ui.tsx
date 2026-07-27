import type { ReactNode } from 'react';

/**
 * The small shared pieces the screens are built from.
 *
 * Kept in one file because they are each a few lines and splitting them across
 * a dozen modules would make them harder to find, not easier.
 */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-line)] pb-6">
      <div>
        <h1 className="text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-soft)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'neutral' | 'warn' | 'good' | 'bad';
}) {
  const toneClass = {
    neutral: 'text-[var(--color-ink)]',
    good: 'text-[var(--color-sage)]',
    warn: 'text-[var(--color-terracotta)]',
    bad: 'text-[var(--color-wine)]',
  }[tone];

  return (
    <div className="card p-5">
      <p className="text-xs tracking-[0.12em] text-[var(--color-ink-muted)] uppercase">{label}</p>
      <p className={`mt-3 font-[family-name:var(--font-display)] text-3xl ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-2 text-xs text-[var(--color-ink-muted)]">{hint}</p> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info';
}) {
  const toneClass = {
    neutral: 'bg-[var(--color-surface-sunk)] text-[var(--color-ink-soft)]',
    good: 'bg-[var(--color-sage-soft)] text-[var(--color-sage)]',
    warn: 'bg-[var(--color-terracotta-soft)] text-[var(--color-terracotta)]',
    bad: 'bg-[var(--color-wine-soft)] text-[var(--color-wine)]',
    info: 'bg-[var(--color-surface-sunk)] text-[var(--color-ink-soft)]',
  }[tone];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] tracking-wide whitespace-nowrap ${toneClass}`}
    >
      {children}
    </span>
  );
}

/**
 * The empty state.
 *
 * Always says three things: that there is nothing here, why there is nothing
 * here, and what to do about it. An empty screen with no explanation is
 * indistinguishable from a broken one.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-8 py-16 text-center">
      <div
        aria-hidden="true"
        className="mb-5 h-10 w-10 border border-[var(--color-line-strong)]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, transparent 0 6px, var(--color-line) 6px 7px)',
        }}
      />
      <h2 className="text-xl">{title}</h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--color-ink-soft)]">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

/** The error state: what broke, and what you can do next. Never a bare stack trace. */
export function ErrorState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="card border-l-2 border-l-[var(--color-wine)] p-6">
      <h2 className="text-lg text-[var(--color-wine)]">{title}</h2>
      <pre className="mt-3 overflow-x-auto text-sm leading-relaxed whitespace-pre-wrap text-[var(--color-ink-soft)]">
        {detail}
      </pre>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Section({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="mb-14">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
