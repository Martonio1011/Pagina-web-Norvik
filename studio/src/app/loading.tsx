/**
 * The loading state.
 *
 * A skeleton of the shape that is coming, not a spinner: the page does not
 * jump when the data lands, and there is never a spinner with nothing behind it.
 */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <div className="mb-10 border-b border-[var(--color-line)] pb-6">
        <div className="h-8 w-56 bg-[var(--color-surface-sunk)]" />
        <div className="mt-3 h-4 w-96 max-w-full bg-[var(--color-surface-sunk)]" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="card p-5">
            <div className="h-3 w-20 bg-[var(--color-surface-sunk)]" />
            <div className="mt-4 h-8 w-16 bg-[var(--color-surface-sunk)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
