'use server';

import { revalidatePath } from 'next/cache';
import { recordDecision } from '@/server/candidates';
import { DecisionAction } from '@/domain/types';

/**
 * Approving, rejecting or parking a candidate.
 *
 * Returns a result rather than throwing so a failed write shows up as a
 * message on the row instead of an error boundary swallowing the whole queue.
 */
export async function decide(input: {
  trendsiProductId: string;
  action: string;
  reason?: string;
}): Promise<{ ok: boolean; message: string; status?: string }> {
  const action = DecisionAction.safeParse(input.action);
  if (!action.success) {
    return { ok: false, message: `Acción no reconocida: ${input.action}` };
  }

  try {
    const result = await recordDecision({
      trendsiProductId: input.trendsiProductId,
      action: action.data,
      reason: input.reason ?? null,
    });

    revalidatePath('/candidates');
    revalidatePath('/');

    const labels: Record<string, string> = {
      APPROVED: 'Aprobado',
      REJECTED: 'Descartado',
      PARKED: 'Aparcado',
      NEW: 'Devuelto a la cola',
    };

    return { ok: true, message: labels[result.status] ?? result.status, status: result.status };
  } catch (error) {
    return {
      ok: false,
      message: `No se pudo guardar la decisión: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
