import 'server-only';
import { randomUUID } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { savedSearches, searchTerms } from '@/db/schema';
import { loadSections } from '@/lib/config';
import { countQueryTokens, isQueryTooLong, shortenQuery } from '@/ingest/trendsi/page-state';
import type { SearchSchedule } from '@/domain/types';

/**
 * Saved searches: the terms the app will look for on Trendsi, per section.
 *
 * The defaults come from `config/sections.yaml`, but only once. After the
 * first creation the database is the live copy, because these are meant to be
 * edited from the app by the person who knows what is selling — not by editing
 * a YAML file.
 */

export interface SearchTermView {
  id: string;
  term: string;
  enabled: boolean;
  lastResults: number | null;
  /** True when Trendsi's four-token limit would swallow this query. */
  tooLong: boolean;
  tokenCount: number;
  /** What would actually be sent, once shortened. */
  effectiveTerm: string;
}

export interface SavedSearchView {
  id: string;
  name: string;
  sectionKey: string;
  sectionLabel: string;
  enabled: boolean;
  schedule: SearchSchedule;
  lastRunAt: Date | null;
  terms: SearchTermView[];
}

function describeTerm(row: { id: string; term: string; enabled: boolean; lastResults: number | null }): SearchTermView {
  return {
    id: row.id,
    term: row.term,
    enabled: row.enabled,
    lastResults: row.lastResults,
    tooLong: isQueryTooLong(row.term),
    tokenCount: countQueryTokens(row.term),
    effectiveTerm: shortenQuery(row.term),
  };
}

export async function getSavedSearches(): Promise<SavedSearchView[]> {
  const sections = loadSections();
  const labelByKey = new Map(sections.map((section) => [section.key, section.label]));

  const searches = await db.select().from(savedSearches).orderBy(asc(savedSearches.name));
  if (searches.length === 0) return [];

  const terms = await db.select().from(searchTerms).orderBy(asc(searchTerms.term));
  const termsBySearch = new Map<string, typeof terms>();
  for (const term of terms) {
    const bucket = termsBySearch.get(term.savedSearchId);
    if (bucket) bucket.push(term);
    else termsBySearch.set(term.savedSearchId, [term]);
  }

  return searches.map((search) => ({
    id: search.id,
    name: search.name,
    sectionKey: search.sectionKey,
    sectionLabel: labelByKey.get(search.sectionKey) ?? search.sectionKey,
    enabled: search.enabled,
    schedule: search.schedule as SearchSchedule,
    lastRunAt: search.lastRunAt,
    terms: (termsBySearch.get(search.id) ?? []).map(describeTerm),
  }));
}

/**
 * Creates one saved search per section from the config defaults.
 *
 * Only fills in what is missing, so running it twice does not duplicate
 * anything and never overwrites terms that have been edited by hand.
 */
export async function createDefaultSearches(): Promise<{ created: number; skipped: number }> {
  const sections = loadSections();
  const existing = await db.select().from(savedSearches);
  const existingBySection = new Set(existing.map((search) => search.sectionKey));

  let created = 0;
  let skipped = 0;

  for (const section of sections) {
    if (existingBySection.has(section.key)) {
      skipped += 1;
      continue;
    }
    if (section.seedTerms.length === 0) {
      skipped += 1;
      continue;
    }

    const searchId = randomUUID();
    await db.insert(savedSearches).values({
      id: searchId,
      name: section.label,
      sectionKey: section.key,
      enabled: true,
      schedule: 'WEEKLY',
      createdAt: new Date(),
    });

    for (const term of section.seedTerms) {
      await db.insert(searchTerms).values({
        id: randomUUID(),
        savedSearchId: searchId,
        term,
        enabled: true,
      });
    }
    created += 1;
  }

  return { created, skipped };
}

export async function addTerm(savedSearchId: string, term: string): Promise<void> {
  const trimmed = term.trim();
  if (trimmed === '') throw new Error('El término no puede estar vacío.');

  await db.insert(searchTerms).values({
    id: randomUUID(),
    savedSearchId,
    term: trimmed,
    enabled: true,
  });
}

export async function removeTerm(termId: string): Promise<void> {
  await db.delete(searchTerms).where(eq(searchTerms.id, termId));
}

export async function setTermEnabled(termId: string, enabled: boolean): Promise<void> {
  await db.update(searchTerms).set({ enabled }).where(eq(searchTerms.id, termId));
}

export async function setSearchSchedule(
  searchId: string,
  schedule: SearchSchedule,
  enabled: boolean,
): Promise<void> {
  await db.update(savedSearches).set({ schedule, enabled }).where(eq(savedSearches.id, searchId));
}
