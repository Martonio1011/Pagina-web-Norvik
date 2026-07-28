import { expect, test } from '@playwright/test';

/**
 * Saved searches and alerts, end to end.
 *
 * The alert assertions run against the real Shopify catalogue loaded by
 * `global-setup.ts` — the $79.99 maxi dress and the $29.99 jumpsuit are
 * genuinely priced outside their bands today, so the alerts these produce are
 * about the actual shop, not about a scenario invented to make them fire.
 */

test.describe.configure({ mode: 'serial' });

test('creates the starting searches from the config defaults', async ({ page }) => {
  await page.goto('/searches');

  await expect(page.getByRole('heading', { name: 'Búsquedas guardadas', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Crear las búsquedas de partida' }).click();

  // Direct children only: each card contains its own nested list of terms,
  // and getByRole('listitem') would count those too.
  const searches = page.getByRole('list', { name: 'Búsquedas guardadas' });
  await expect(searches.locator('> li')).toHaveCount(6);
  await expect(searches).toContainText('Maxi Dresses');
  await expect(searches).toContainText('satin maxi dress');
});

test('is safe to press twice', async ({ page }) => {
  await page.goto('/searches');
  await page.getByRole('button', { name: 'Restaurar las que falten' }).click();

  await expect(page.getByRole('status')).toContainText('Ya estaban todas creadas');
  await expect(page.getByRole('list', { name: 'Búsquedas guardadas' }).locator('> li')).toHaveCount(
    6,
  );
});

test('adds a term and warns when it is too long for Trendsi', async ({ page }) => {
  await page.goto('/searches');

  const card = page
    .getByRole('list', { name: 'Búsquedas guardadas' })
    .locator('> li')
    .filter({ hasText: 'Linen Sets' });
  await card.getByLabel(/^Nuevo término/).fill('linen top and shorts set');
  await card.getByRole('button', { name: 'Añadir' }).click();

  // Saved exactly as typed, with what will actually be sent spelled out.
  await expect(card.getByRole('status')).toContainText('5 palabras');
  await expect(card).toContainText('linen top and shorts set');
  await expect(card).toContainText('se buscará «linen top and shorts»');
});

test('removes a term', async ({ page }) => {
  await page.goto('/searches');

  const card = page
    .getByRole('list', { name: 'Búsquedas guardadas' })
    .locator('> li')
    .filter({ hasText: 'Jumpsuits' });
  const before = await card.getByRole('checkbox').count();

  await card.getByRole('button', { name: 'Quitar' }).first().click();
  await expect(card.getByRole('checkbox')).toHaveCount(before - 1);
});

test('raises alerts about the real catalogue', async ({ page }) => {
  await page.goto('/alerts');

  await expect(page.getByRole('heading', { name: 'Alertas', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Revisar ahora' }).click();

  const alerts = page.getByRole('list', { name: 'Alertas' });

  // The $79.99 dress really is above the $42–72 Maxi Dresses band.
  const overpriced = alerts
    .getByRole('listitem')
    .filter({ hasText: 'One-Shoulder Ruched Maxi Dress' });
  await expect(overpriced).toContainText('por encima del techo');
  await expect(overpriced).toContainText('$79.99');
});

test('closes an alert and remembers it', async ({ page }) => {
  await page.goto('/alerts');

  const first = page.getByRole('list', { name: 'Alertas' }).getByRole('listitem').first();
  const title = await first.locator('p').first().innerText();

  await first.getByRole('button', { name: 'Marcar como resuelta' }).click();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Resueltas' })).toBeVisible();
  await expect(page.getByText(title, { exact: false }).first()).toBeVisible();
});

test('does not re-raise an alert that is already open', async ({ page }) => {
  await page.goto('/alerts');

  const countBefore = await page
    .getByRole('list', { name: 'Alertas' })
    .getByRole('listitem')
    .count();

  await page.getByRole('button', { name: 'Revisar ahora' }).click();
  await expect(page.getByRole('status').first()).toContainText('siguen abiertas');

  await page.reload();
  const countAfter = await page
    .getByRole('list', { name: 'Alertas' })
    .getByRole('listitem')
    .count();

  // Running the check twice must not produce two copies of the same problem.
  expect(countAfter).toBe(countBefore);
});
