import { loadBrandRules } from '@/lib/config';
import { scoreProduct, type ScoreGroup } from '@/domain/scoring';
import { Badge, PageHeader, Section } from '@/components/ui';
import { ScorePlayground } from '@/components/score-playground';

export const dynamic = 'force-dynamic';

const GROUP_LABEL: Record<ScoreGroup, string> = {
  MATERIALS: 'Materiales y detalles',
  SILHOUETTE: 'Silueta',
  COLOR: 'Color',
  PRICE_FIT: 'Encaje de precio',
  VOCABULARY: 'Vocabulario',
};

/**
 * The brand rules, made visible.
 *
 * The score decides what gets bought, so the rules behind it cannot live only
 * in a YAML file the owner is expected to open in a text editor. This page
 * shows exactly what is being rewarded and penalised, and lets a title be
 * tried against the rules to see the breakdown it would produce.
 */
export default function BrandPage() {
  const rules = loadBrandRules();

  const groups: { group: ScoreGroup; weight: number; positive: string[]; negative: string[] }[] = [
    {
      group: 'MATERIALS',
      weight: rules.weights.materials,
      positive: rules.materials.positive,
      negative: rules.materials.negative,
    },
    {
      group: 'SILHOUETTE',
      weight: rules.weights.silhouette,
      positive: rules.silhouette.positive,
      negative: rules.silhouette.negative,
    },
    {
      group: 'COLOR',
      weight: rules.weights.color,
      positive: rules.color.positive,
      negative: rules.color.negative,
    },
    {
      group: 'VOCABULARY',
      weight: rules.weights.vocabulary,
      positive: rules.vocabulary.positive,
      negative: rules.vocabulary.negative,
    },
  ];

  // Scored on the server so the playground starts with something real on screen
  // rather than an empty box.
  const example = scoreProduct(rules, {
    title: 'Satin Halter Maxi Dress',
    description: 'An effortless, timeless piece for golden hour.',
    colors: ['Chocolate'],
    priceFit: {
      withinBand: true,
      meetsTargetMargin: true,
      meetsMinimumMargin: true,
      suggestedRetailLabel: '$67.99',
      sectionLabel: 'Maxi Dresses',
    },
  });

  return (
    <>
      <PageHeader
        title="Encaje de marca"
        description="Las reglas con las que se puntúa cada producto de 0 a 100. Se editan en config/brand-rules.yaml y no hace falta tocar código."
      />

      <Section
        title="Cómo se reparten los 100 puntos"
        description="Cada grupo tiene un techo. Ninguno puede comerse el sitio de otro."
      >
        <ul aria-label="Pesos del score" className="card divide-y divide-[var(--color-line)]">
          {(
            [
              ['MATERIALS', rules.weights.materials, 'Lo que más define la marca'],
              ['SILHOUETTE', rules.weights.silhouette, 'La forma de la prenda'],
              ['PRICE_FIT', rules.weights.priceFit, 'Si el precio viable cae en su horquilla'],
              ['COLOR', rules.weights.color, 'Los cinco colores con demanda'],
              ['VOCABULARY', rules.weights.vocabulary, 'El tono de la ficha'],
            ] as const
          ).map(([group, weight, hint]) => (
            <li key={group} className="flex items-center gap-4 px-5 py-4">
              <span className="w-48 shrink-0 text-sm">{GROUP_LABEL[group]}</span>
              <span
                aria-hidden="true"
                className="h-2 bg-[var(--color-sage)]"
                style={{ width: `${weight * 4}px` }}
              />
              <span className="tabular-nums text-sm text-[var(--color-ink-soft)]">{weight}</span>
              <span className="ml-auto hidden text-xs text-[var(--color-ink-muted)] sm:block">
                {hint}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Pruébalo"
        description="Escribe el título de un producto y mira qué puntuación le daría y por qué."
      >
        <ScorePlayground initialTitle="Satin Halter Maxi Dress" initialResult={example} />
      </Section>

      <Section
        title="Descartes automáticos"
        description="Estos productos no puntúan bajo: no se puntúan. Un producto puede tener un margen excelente y aun así no ir en la tienda."
      >
        <ul className="card divide-y divide-[var(--color-line)]">
          {rules.exclusions.map((exclusion) => (
            <li key={exclusion.reason} className="px-5 py-4">
              <p className="text-sm">{exclusion.reason}</p>
              <p className="mt-1.5 text-xs text-[var(--color-ink-muted)]">
                {exclusion.terms.join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      {groups.map((entry) => (
        <Section
          key={entry.group}
          title={GROUP_LABEL[entry.group]}
          description={`Hasta ${entry.weight} puntos.`}
        >
          <div className="card p-5">
            <p className="mb-2 text-xs tracking-[0.12em] text-[var(--color-ink-muted)] uppercase">
              Suman
            </p>
            <div className="flex flex-wrap gap-1.5">
              {entry.positive.map((term) => (
                <Badge key={term} tone="good">
                  {term}
                </Badge>
              ))}
            </div>

            {entry.negative.length > 0 ? (
              <>
                <p className="mt-5 mb-2 text-xs tracking-[0.12em] text-[var(--color-ink-muted)] uppercase">
                  Restan
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {entry.negative.map((term) => (
                    <Badge key={term} tone="bad">
                      {term}
                    </Badge>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </Section>
      ))}
    </>
  );
}
