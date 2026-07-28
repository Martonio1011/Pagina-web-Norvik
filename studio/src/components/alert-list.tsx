'use client';

import { useState, useTransition } from 'react';
import { changeAlertStatus, runAlertCheck } from '@/app/alerts/actions';
import type { AlertView } from '@/server/alerts';
import { Badge } from './ui';

const SEVERITY_LABEL: Record<string, string> = {
  CRITICAL: 'Crítico',
  WARNING: 'Atención',
  INFO: 'Info',
};

const SEVERITY_TONE: Record<string, 'bad' | 'warn' | 'info'> = {
  CRITICAL: 'bad',
  WARNING: 'warn',
  INFO: 'info',
};

export function CheckAlertsButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await runAlertCheck();
            setMessage({ ok: result.ok, text: result.message });
          })
        }
        className="border border-[var(--color-ink)] bg-[var(--color-ink)] px-4 py-2 text-sm text-[var(--color-canvas)] hover:opacity-85 disabled:opacity-60"
      >
        {pending ? 'Revisando…' : 'Revisar ahora'}
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

export function AlertList({ alerts }: { alerts: AlertView[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <ul aria-label="Alertas" className="card divide-y divide-[var(--color-line)]">
      {alerts.map((alert) => (
        <li key={alert.id} className="px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="text-sm">{alert.title}</p>
            <div className="flex items-center gap-2">
              <Badge tone={SEVERITY_TONE[alert.severity] ?? 'info'}>
                {SEVERITY_LABEL[alert.severity] ?? alert.severity}
              </Badge>
              {alert.status !== 'OPEN' ? <Badge>{alert.status}</Badge> : null}
            </div>
          </div>

          <p className="mt-1.5 text-sm text-[var(--color-ink-soft)]">{alert.body}</p>

          {Object.keys(alert.data).length > 0 ? (
            <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-xs text-[var(--color-ink-muted)]">
              {Object.entries(alert.data).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <dt>{key}</dt>
                  <dd className="text-[var(--color-ink-soft)]">{String(value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {alert.status === 'OPEN' ? (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await changeAlertStatus(alert.id, 'RESOLVED');
                })
              }
              className="mt-3 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-sage)] hover:underline disabled:opacity-50"
            >
              Marcar como resuelta
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
