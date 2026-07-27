import Image from 'next/image';
import { getShopifyEnv } from '@/env';
import { getCatalogProducts } from '@/server/catalog';
import { formatCents } from '@/domain/money';
import { classifySection } from '@/domain/sections';
import { loadSections } from '@/lib/config';
import { parseTrdSku } from '@/domain/matching';
import { Badge, EmptyState, PageHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

/**
 * The catalogue as it is on the store right now.
 *
 * Real product photography from Shopify's CDN, real prices, real stock. There
 * is no placeholder imagery anywhere in this app: a product without a photo
 * shows an explicit "sin imagen" panel, because a fake thumbnail is worse than
 * an honest gap.
 */
export default function CatalogPage() {
  const shopify = getShopifyEnv();
  const products = getCatalogProducts();
  const sections = loadSections();

  if (products.length === 0) {
    return (
      <>
        <PageHeader title="Catálogo" />
        <EmptyState
          title="Nada sincronizado todavía"
          description={
            shopify.ok
              ? 'Vuelve al panel y pulsa «Sincronizar con Shopify» para traer tu catálogo real.'
              : 'Primero configura las credenciales de Shopify en el archivo .env.'
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Catálogo"
        description={`${products.length} productos sincronizados de norviik.myshopify.com.`}
      />

      <ul
        aria-label="Productos del catálogo"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {products.map((product) => {
          const { section } = classifySection(sections, {
            title: product.title,
            productType: product.productType,
            tags: product.tags,
          });
          const trdSku = product.skus.map(parseTrdSku).find((parsed) => parsed !== null);
          const hasPrice = product.minPriceCents >= 0;
          const priceLabel = !hasPrice
            ? 'Sin precio'
            : product.minPriceCents === product.maxPriceCents
              ? formatCents(product.minPriceCents)
              : `${formatCents(product.minPriceCents)} – ${formatCents(product.maxPriceCents)}`;

          return (
            <li key={product.id} className="card flex flex-col">
              <div className="relative aspect-[3/4] overflow-hidden bg-[var(--color-surface-sunk)]">
                {product.featuredImage ? (
                  <Image
                    src={product.featuredImage}
                    alt={product.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[var(--color-ink-muted)]">
                    Sin imagen
                  </div>
                )}
                <div className="absolute top-3 left-3 flex flex-col items-start gap-1">
                  {product.status !== 'ACTIVE' ? (
                    <Badge tone="warn">
                      {product.status === 'DRAFT' ? 'Borrador' : product.status}
                    </Badge>
                  ) : null}
                  {product.totalInventory <= 0 ? <Badge tone="bad">Sin stock</Badge> : null}
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <h2 className="text-base leading-snug">{product.title}</h2>
                  <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{priceLabel}</p>
                </div>

                <dl className="mt-auto space-y-1.5 text-xs text-[var(--color-ink-muted)]">
                  <div className="flex justify-between gap-3">
                    <dt>Sección</dt>
                    <dd className="text-right text-[var(--color-ink-soft)]">
                      {section?.label ?? 'Sin clasificar'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Stock</dt>
                    <dd className="text-right text-[var(--color-ink-soft)]">
                      {product.totalInventory} uds · {product.variantCount} var.
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Trendsi</dt>
                    <dd className="text-right text-[var(--color-ink-soft)]">
                      {trdSku
                        ? `id ${trdSku.productId}`
                        : product.skus.some((sku) => /^\d{12,18}$/.test(sku))
                          ? 'sku id de Trendsi'
                          : '—'}
                    </dd>
                  </div>
                </dl>

                <a
                  href={`https://norviik.myshopify.com/admin/products/${product.legacyId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[var(--color-sage)] hover:underline"
                >
                  Abrir en Shopify →
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
