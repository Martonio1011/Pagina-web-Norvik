# Norvik theme

Custom Shopify theme for **Norvik** (norviik.myshopify.com), built on Dawn 15.
Everything under the `norvik` / `nv-` prefix is bespoke; Dawn supplies the
header, footer, cart drawer shell, facets and accessibility plumbing.

## Where it lives

| | |
|---|---|
| Preview theme | `Norvik Theme (WIP)` — unpublished, id `157637312701` |
| Preview URL | `https://norviik.myshopify.com/?preview_theme_id=157637312701` |
| Source | this folder, on branch `claude/norvik-control-center-lmfq1k` |

The live theme has **not** been touched.

## Sections created

| Section | Page | What it does |
|---|---|---|
| `hero-campaign` | Home | Full-bleed campaign image, eyebrow + headline + two CTAs |
| `category-pills` | Home | Circular or text category shortcuts |
| `best-sellers-quickadd` | Home | Carousel or grid with hover quick add |
| `editorial-grid` | Home | 2×2 "shop the occasion" tiles |
| `ugc-carousel` | Home | Customer photos |
| `customer-videos` | Home | Vertical 9:16 customer clips, click-to-play |
| `incentive-bar` | Home | Free shipping / welcome offer / returns |
| `email-popup` | All pages | 15s or 50% scroll, once per session |
| `collection-grid` | Collection | 3-col grid, 2/3 toggle, subcategory pills, native facets |
| `main-product-norvik` | Product | Gallery, variant picker, fit scale, accordions |
| `complete-the-look` | Product | Native product recommendations |
| `product-reviews` | Product | Anchor for a reviews app |
| `wishlist` | `/pages/wishlist` | Renders the localStorage wishlist |

Snippets: `norvik-card`, `wishlist-button`, `norvik-vars`, `free-shipping-bar`,
`cart-crosssell`. Assets: `norvik.css`, `norvik.js` (no dependencies, no jQuery).

## Theme settings → Norvik

- **Accent colour** — Terracotta `#C66A4E` (active) or Golden sand `#C9A227`, or a custom value
- **Off-white base / soft black**
- **Free shipping from** — default `75`. Drives the cart progress bar and `{{ threshold }}` in the incentive bar
- **Delivery estimate** — default `7-15 business days`. Shown on the product page and in the Shipping accordion
- **Cross-sell products in the cart** — 0-4
- **Size guide page**

## Metafields you need to fill in

Create these under **Settings → Custom data → Products**:

| Namespace & key | Type | Notes |
|---|---|---|
| `custom.fit_scale` | Integer | **1** runs small · **3** true to size · **5** runs large. Outside 1-5 the widget is hidden |
| `custom.fit_note` | Single line text | Optional, e.g. "Bodice runs snug — size up if between" |
| `custom.size_fit` | Rich text | Optional, fills the "Size & fit" accordion |

The fit scale is the differentiator versus Hello Molly and Princess Polly, and
it only works once `custom.fit_scale` is populated per product.

## Apps worth installing

- **Judge.me** (free tier) — reviews. Point its widget at `#norvik-reviews`; then turn off the placeholder in the Reviews section
- **Shopify Search & Discovery** (free, first-party) — required for the size/colour/price filters to appear on collection pages, and for "complementary" product pairings in Complete the look

## Known gaps against the real catalogue

1. **Tags are unreliable for automatic collections.** `Mini Dress` exists on no product; `Maxi Dress` is on 2 of 4 maxi dresses. Use `product_type` (Dress ×7, Jumpsuit, Bracelet ×2, Necklace, Bags ×2) or title matching instead.
2. **The five accessories have a single photo each.** The gallery drops its thumbnail rail for them automatically, and their cards have no hover image.
3. **Vacation / Wedding guest / Weekend / Date night are not real collections.** The editorial tiles point at the closest existing ones.
4. **No product has a `compare_at_price`**, so the discount badge and struck-through price never render today. They will as soon as one is set.

## Publishing checklist

- [ ] Open the preview and walk home → collection → product → cart on desktop and mobile
- [ ] Install Search & Discovery and configure the filters you want
- [ ] Fill `custom.fit_scale` on every product
- [ ] Add real customer photos and videos to the UGC and video sections
- [ ] Set the hero image (currently a placeholder)
- [ ] Create `/pages/wishlist` using the **Wishlist** template
- [ ] Confirm the free shipping threshold matches your actual shipping rates
- [ ] Run Lighthouse on mobile and confirm ≥ 80
- [ ] **Duplicate the current live theme as a backup**, then publish
