import { getAlerts } from '@/server/alerts';
import { EmptyState, PageHeader, Section, StatCard } from '@/components/ui';
import { AlertList, CheckAlertsButton } from '@/components/alert-list';

export const dynamic = 'force-dynamic';

/**
 * What needs attention, and nothing else.
 *
 * Every alert here was raised because a condition changed or is actionable —
 * never merely because a number exists. A list that fills up with things you
 * cannot act on is a list nobody reads, and then the one that mattered goes
 * unread too.
 */
export default async function AlertsPage() {
  const open = await getAlerts('OPEN');
  const all = await getAlerts('ALL');
  const resolved = all.filter((alert) => alert.status === 'RESOLVED');

  const critical = open.filter((alert) => alert.severity === 'CRITICAL').length;
  const warning = open.filter((alert) => alert.severity === 'WARNING').length;

  return (
    <>
      <PageHeader
        title="Alertas"
        description="Rotura de stock en Trendsi, subidas de coste y precios tuyos fuera de sitio."
        actions={<CheckAlertsButton />}
      />

      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Abiertas" value={open.length} tone={open.length > 0 ? 'warn' : 'good'} />
        <StatCard label="Críticas" value={critical} tone={critical > 0 ? 'bad' : 'good'} />
        <StatCard label="De atención" value={warning} />
        <StatCard label="Resueltas" value={resolved.length} />
      </div>

      {open.length === 0 ? (
        <EmptyState
          title="Nada que avisar"
          description={
            all.length === 0
              ? 'Todavía no se ha hecho ninguna revisión. Pulsa «Revisar ahora» para comprobar stock, costes y precios.'
              : 'No hay alertas abiertas. Todo lo que había se ha resuelto.'
          }
        />
      ) : (
        <Section title="Abiertas" description={`${open.length} sin resolver.`}>
          <AlertList alerts={open} />
        </Section>
      )}

      {resolved.length > 0 ? (
        <Section title="Resueltas" description="Se guardan para tener el historial.">
          <div className="opacity-70">
            <AlertList alerts={resolved.slice(0, 20)} />
          </div>
        </Section>
      ) : null}
    </>
  );
}
