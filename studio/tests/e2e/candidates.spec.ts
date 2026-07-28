import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { seedSyntheticTrendsi } from '../helpers/synthetic-trendsi';

/**
 * The Phase 3 flow: a candidate is evaluated, ranked, decided on, and lands in
 * an export.
 *
 * The products behind it are synthetic and say so — see
 * `tests/helpers/synthetic-trendsi.ts`. There is no real Trendsi capture yet,
 * and this suite is about whether the queue works, not about what Trendsi
 * actually sells.
 */

test.beforeAll(async () => {
  await seedSyntheticTrendsi(resolve(process.cwd(), 'e2e.db'));
});

test('ranks candidates by brand fit, not by margin', async ({ page }) => {
  await page.goto('/candidates');

  await expect(page.getByRole('heading', { name: 'Cola de decisión', level: 1 })).toBeVisible();

  const pending = page.getByRole('list', { name: 'Candidatos por decidir' }).getByRole('listitem');

  // The satin maxi fits the brand; the sequin bodycon is cheaper and would win
  // a margin-first sort. Fit has to come first.
  await expect(pending.first()).toContainText('Satin Halter Maxi Dress');
  await expect(pending.first()).toContainText('Prometedor');
});

test('shows the money for each candidate', async ({ page }) => {
  await page.goto('/candidates');

  const card = page
    .getByRole('listitem')
    .filter({ hasText: 'Satin Halter Maxi Dress' })
    .first();

  await expect(card).toContainText('Coste + envío');
  await expect(card).toContainText('$23.50');
  await expect(card).toContainText('PVP sugerido');
  await expect(card).toContainText('$67.99');
  await expect(card).toContainText('Margen neto');
});

test('opens the score breakdown on demand', async ({ page }) => {
  await page.goto('/candidates');

  const card = page
    .getByRole('listitem')
    .filter({ hasText: 'Satin Halter Maxi Dress' })
    .first();

  await card.getByRole('button', { name: 'Ver de dónde sale el score' }).click();

  await expect(card).toContainText('Brand Fit Score');
  await expect(card).toContainText('"satin" aparece en título');
  await expect(card).toContainText('Materiales');
});

test('marks a product already in the shop instead of proposing it again', async ({ page }) => {
  await page.goto('/candidates');

  const jumpsuit = page
    .getByRole('listitem')
    .filter({ hasText: 'Cowl Neck Wide-Leg Jumpsuit' })
    .first();

  await expect(jumpsuit).toContainText('Ya lo tienes');
  await expect(jumpsuit).toContainText('coincidencia exacta por SKU');
});

test('discards childrenswear without scoring it', async ({ page }) => {
  await page.goto('/candidates');

  const kids = page.getByRole('listitem').filter({ hasText: 'Girls Floral Party Dress' }).first();

  await expect(kids).toContainText('Descartado');
  await expect(kids).toContainText('Ropa infantil');
  // No score at all, not a low one.
  await expect(kids).not.toContainText('/100');
});

test('approving a candidate puts it in the downloadable buying list', async ({ page }) => {
  await page.goto('/candidates');

  const card = page
    .getByRole('list', { name: 'Candidatos por decidir' })
    .getByRole('listitem')
    .filter({ hasText: 'Satin Halter Maxi Dress' })
    .first();

  await card.getByLabel(/^Motivo para/).fill('Encaja perfecto con resort');
  await card.getByRole('button', { name: 'Aprobar' }).click();

  // Approving revalidates the page, which moves the card out of the pending
  // list and into the decided one — so that move is the assertion, not the
  // inline status message, which belongs to a card that no longer exists.
  const decided = page.getByRole('list', { name: 'Candidatos ya decididos' });
  await expect(decided.getByRole('listitem').filter({ hasText: 'Satin Halter Maxi Dress' })).toBeVisible();

  // The decision survives a reload, so it was written to the database.
  await page.reload();
  await expect(
    page
      .getByRole('list', { name: 'Candidatos ya decididos' })
      .getByRole('listitem')
      .filter({ hasText: 'Satin Halter Maxi Dress' }),
  ).toContainText('Aprobado');

  // And it is downloadable.
  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Descargar XLSX' }).click(),
  ]);

  expect(download[0].suggestedFilename()).toMatch(/^norvik-compras-\d{4}-\d{2}-\d{2}\.xlsx$/);
});

test('the CSV export carries the real numbers', async ({ request }) => {
  const response = await request.get('/api/export?format=csv');

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/csv');

  const csv = await response.text();
  expect(csv).toContain('Producto');
  expect(csv).toContain('Satin Halter Maxi Dress');
  expect(csv).toContain('67.99');
  expect(csv).toContain('https://app.trendsi.com/products/detail?id=SYNTH-001');
});

test('asks for confirmation before creating anything in Shopify', async ({ page }) => {
  await page.goto('/candidates');

  const approved = page
    .getByRole('list', { name: 'Candidatos ya decididos' })
    .getByRole('listitem')
    .filter({ hasText: 'Satin Halter Maxi Dress' });

  // One click only offers the question — nothing has been sent yet.
  await approved.getByRole('button', { name: 'Crear borrador en Shopify' }).click();

  await expect(approved).toContainText('como borrador');
  await expect(approved).toContainText('No se publica');
  await expect(approved.getByRole('button', { name: 'Sí, crear el borrador' })).toBeVisible();

  // Cancelling leaves everything as it was.
  await approved.getByRole('button', { name: 'Cancelar' }).click();
  await expect(approved.getByRole('button', { name: 'Crear borrador en Shopify' })).toBeVisible();
});

test('says plainly that Shopify is not configured rather than failing obscurely', async ({
  page,
}) => {
  await page.goto('/candidates');

  const approved = page
    .getByRole('list', { name: 'Candidatos ya decididos' })
    .getByRole('listitem')
    .filter({ hasText: 'Satin Halter Maxi Dress' });

  await approved.getByRole('button', { name: 'Crear borrador en Shopify' }).click();
  await approved.getByRole('button', { name: 'Sí, crear el borrador' }).click();

  // No admin token is set in the test environment, and that is exactly the
  // state a new install is in, so the message has to be actionable.
  await expect(approved.getByRole('status')).toContainText('Falta el token');
});
