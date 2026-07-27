import { expect, test } from '@playwright/test';

/**
 * The Phase 1 end-to-end flow: a synced catalogue reaches the dashboard, the
 * grid and the audit, carrying the real numbers all the way.
 *
 * The database is loaded from the saved Shopify response by `global-setup.ts`
 * before any test runs, which stands in for the sync having happened — the
 * sync itself is covered by the integration tests, and cannot reach Shopify
 * from a test run anyway.
 */

test('the dashboard reports the catalogue it actually has', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Panel', level: 1 })).toBeVisible();
  await expect(page.getByText('Productos', { exact: true })).toBeVisible();

  // Five products, three of them live, two in draft.
  await expect(page.locator('text=/^5$/').first()).toBeVisible();

  // Every configured section is accounted for, empty ones included.
  const coverage = page.getByRole('list', { name: 'Cobertura por sección' });
  await expect(coverage.getByRole('listitem')).toHaveCount(6);
  await expect(coverage).toContainText('Maxi Dresses');
  await expect(coverage).toContainText('Mini & Midi Dresses');

  // Linen Sets points at no Shopify collection yet. The dashboard says why it
  // reads as empty instead of just showing a zero.
  const linen = coverage.getByRole('listitem').filter({ hasText: 'Linen Sets' });
  await expect(linen).toContainText('Vacía');
  await expect(linen).toContainText('Sin colección configurada');

  // Dresses does have one, and the products in it are counted.
  const maxi = coverage.getByRole('listitem').filter({ hasText: 'Maxi Dresses' });
  await expect(maxi).toContainText('producto');
});

test('the catalogue grid shows real products with real prices', async ({ page }) => {
  await page.goto('/catalog');

  await expect(page.getByRole('heading', { name: 'Catálogo', level: 1 })).toBeVisible();

  const cards = page.getByRole('list', { name: 'Productos del catálogo' }).getByRole('listitem');
  await expect(cards).toHaveCount(5);

  await expect(page.getByRole('heading', { name: 'One-Shoulder Ruched Maxi Dress' })).toBeVisible();
  await expect(page.getByText('$79.99').first()).toBeVisible();

  // Draft and out-of-stock states are visible on the card, not hidden.
  await expect(page.getByText('Borrador').first()).toBeVisible();
  await expect(page.getByText('Sin stock').first()).toBeVisible();

  // Every card links into the Shopify admin for that product.
  await expect(page.getByRole('link', { name: /Abrir en Shopify/ }).first()).toHaveAttribute(
    'href',
    /admin\/products\/\d+/,
  );
});

test('the audit flags the dress priced above its band, with the evidence', async ({ page }) => {
  await page.goto('/audit');

  await expect(page.getByRole('heading', { name: 'Auditoría', level: 1 })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Precio por encima de la horquilla' }),
  ).toBeVisible();

  const finding = page.getByRole('listitem').filter({ hasText: 'One-Shoulder Ruched Maxi Dress' });
  await expect(finding).toContainText('$79.99');
  await expect(finding).toContainText('$72.00');
  await expect(finding).toContainText('maxi-dresses');
});

test('the run trace is recorded and reachable', async ({ page }) => {
  await page.goto('/runs');

  await expect(page.getByRole('heading', { name: 'Ejecuciones', level: 1 })).toBeVisible();
  await expect(page.getByText('SHOPIFY').first()).toBeVisible();

  await page.getByRole('link', { name: 'Ver' }).first().click();
  await expect(page.getByRole('heading', { name: /Ejecución/, level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ningún error' })).toBeVisible();
});

test('is navigable by keyboard and offers a skip link', async ({ page }) => {
  await page.goto('/');

  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Saltar al contenido' });
  await expect(skipLink).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Norvik' })).toBeFocused();
});
