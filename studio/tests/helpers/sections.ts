import type { Section } from '@/domain/sections';

/**
 * Sections built by hand for tests, so a test never breaks because someone
 * adjusted a price band in `config/sections.yaml`. The config file itself is
 * validated separately, in `tests/domain/sections.test.ts`.
 */
export function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    key: 'maxi-dresses',
    label: 'Maxi Dresses',
    priceBandCents: { min: 4200, max: 7200 },
    targetMargin: 0.65,
    minAcceptableMarginPct: 0.5,
    collections: ['dresses'],
    match: { productTypes: ['dress'], keywords: ['maxi'], requireAny: [] },
    ...overrides,
  };
}

export const accessoriesSection: Section = {
  key: 'accessories',
  label: 'Accessories',
  priceBandCents: { min: 2600, max: 4900 },
  targetMargin: 0.68,
  minAcceptableMarginPct: 0.5,
  collections: ['accessories'],
  match: { productTypes: ['bag'], keywords: ['bag', 'necklace'], requireAny: [] },
};
