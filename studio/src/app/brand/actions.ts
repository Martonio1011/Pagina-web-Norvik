'use server';

import { loadBrandRules } from '@/lib/config';
import { scoreProduct, type ScoreBreakdown } from '@/domain/scoring';

/**
 * Scores a title typed into the playground.
 *
 * The rules are read on the server on every call rather than cached in the
 * browser, so editing `config/brand-rules.yaml` and trying again shows the new
 * result — which is the whole point of the rules living in a file.
 */
export async function scoreTitle(input: {
  title: string;
  description: string;
  colors: string;
}): Promise<ScoreBreakdown> {
  const rules = loadBrandRules();

  return scoreProduct(rules, {
    title: input.title,
    description: input.description.trim() === '' ? null : input.description,
    colors: input.colors
      .split(',')
      .map((colour) => colour.trim())
      .filter((colour) => colour !== ''),
    // The playground scores brand fit only. There is no supplier cost behind a
    // typed-in title, and inventing one would inflate every result by twenty
    // points on the strength of nothing.
    priceFit: null,
  });
}
