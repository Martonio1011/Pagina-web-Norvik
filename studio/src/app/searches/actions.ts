'use server';

import { revalidatePath } from 'next/cache';
import {
  addTerm,
  createDefaultSearches,
  removeTerm,
  setSearchSchedule,
  setTermEnabled,
} from '@/server/searches';
import { SearchSchedule } from '@/domain/types';
import { countQueryTokens, isQueryTooLong, shortenQuery } from '@/ingest/trendsi/page-state';

export interface SearchActionResult {
  ok: boolean;
  message: string;
}

function done(message: string): SearchActionResult {
  revalidatePath('/searches');
  return { ok: true, message };
}

function failed(error: unknown): SearchActionResult {
  return {
    ok: false,
    message: error instanceof Error ? error.message : String(error),
  };
}

export async function seedSearches(): Promise<SearchActionResult> {
  try {
    const { created, skipped } = await createDefaultSearches();
    return done(
      created === 0
        ? 'Ya estaban todas creadas.'
        : `Creadas ${created} búsquedas${skipped > 0 ? `, ${skipped} ya existían` : ''}.`,
    );
  } catch (error) {
    return failed(error);
  }
}

export async function addSearchTerm(
  savedSearchId: string,
  term: string,
): Promise<SearchActionResult> {
  try {
    await addTerm(savedSearchId, term);

    // Warn rather than refuse: the term is saved as typed, and the app shows
    // what it will actually send. Silently truncating what someone wrote would
    // be worse than telling them.
    if (isQueryTooLong(term)) {
      return done(
        `Guardado. Ojo: tiene ${countQueryTokens(term)} palabras y Trendsi no devuelve nada con más de 4, así que se buscará «${shortenQuery(term)}».`,
      );
    }
    return done('Término añadido.');
  } catch (error) {
    return failed(error);
  }
}

export async function deleteSearchTerm(termId: string): Promise<SearchActionResult> {
  try {
    await removeTerm(termId);
    return done('Término eliminado.');
  } catch (error) {
    return failed(error);
  }
}

export async function toggleSearchTerm(
  termId: string,
  enabled: boolean,
): Promise<SearchActionResult> {
  try {
    await setTermEnabled(termId, enabled);
    return done(enabled ? 'Término activado.' : 'Término desactivado.');
  } catch (error) {
    return failed(error);
  }
}

export async function updateSchedule(
  searchId: string,
  schedule: string,
  enabled: boolean,
): Promise<SearchActionResult> {
  const parsed = SearchSchedule.safeParse(schedule);
  if (!parsed.success) return { ok: false, message: `Frecuencia no reconocida: ${schedule}` };

  try {
    await setSearchSchedule(searchId, parsed.data, enabled);
    return done('Frecuencia guardada.');
  } catch (error) {
    return failed(error);
  }
}
