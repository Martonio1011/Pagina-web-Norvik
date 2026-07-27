import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { resolveSections, sectionsConfigSchema, type Section } from '@/domain/sections';

/**
 * Loads the versioned rule files from `config/`.
 *
 * A malformed config file stops the app with an explanation naming the file
 * and the field. Half-loaded rules would produce plausible-looking prices
 * built on nothing, which is the worst possible failure for this app.
 */

const CONFIG_DIR = resolve(process.cwd(), 'config');

export class ConfigError extends Error {
  constructor(file: string, detail: string) {
    super(`config/${file} is not valid:\n${detail}`);
    this.name = 'ConfigError';
  }
}

function readYaml(file: string): unknown {
  const path = resolve(CONFIG_DIR, file);
  try {
    return parseYaml(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new ConfigError(file, error instanceof Error ? error.message : String(error));
  }
}

let sectionsCache: Section[] | null = null;

export function loadSections(): Section[] {
  if (sectionsCache) return sectionsCache;

  const raw = readYaml('sections.yaml');
  const parsed = sectionsConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new ConfigError('sections.yaml', detail);
  }

  sectionsCache = resolveSections(parsed.data);
  return sectionsCache;
}

/** Test-only: forces the next call to re-read from disk. */
export function resetConfigCache(): void {
  sectionsCache = null;
}
