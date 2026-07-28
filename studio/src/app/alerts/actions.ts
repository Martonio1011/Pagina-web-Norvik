'use server';

import { revalidatePath } from 'next/cache';
import { evaluateAlerts, setAlertStatus } from '@/server/alerts';
import { AlertStatus } from '@/domain/types';

export async function runAlertCheck(): Promise<{ ok: boolean; message: string }> {
  try {
    const result = await evaluateAlerts();
    revalidatePath('/alerts');
    revalidatePath('/');

    const parts: string[] = [];
    if (result.raised > 0) parts.push(`${result.raised} nuevas`);
    if (result.reopened > 0) parts.push(`${result.reopened} reabiertas`);
    if (result.resolved > 0) parts.push(`${result.resolved} resueltas`);
    if (result.unchanged > 0) parts.push(`${result.unchanged} siguen abiertas`);

    return {
      ok: true,
      message: parts.length > 0 ? `Revisión hecha: ${parts.join(', ')}.` : 'Revisión hecha: nada que avisar.',
    };
  } catch (error) {
    return {
      ok: false,
      message: `No se pudo revisar: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function changeAlertStatus(
  alertId: string,
  status: string,
): Promise<{ ok: boolean; message: string }> {
  const parsed = AlertStatus.safeParse(status);
  if (!parsed.success) return { ok: false, message: `Estado no reconocido: ${status}` };

  try {
    await setAlertStatus(alertId, parsed.data);
    revalidatePath('/alerts');
    return { ok: true, message: parsed.data === 'RESOLVED' ? 'Marcada como resuelta.' : 'Actualizada.' };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
