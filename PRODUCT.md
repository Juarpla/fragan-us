# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Shoppers in Peru who are new to Arabic perfumes, including people choosing a gift. They need enough context about scent, climate, and occasion to choose a bottle online.
- Shoppers in Peru who already know Arabic perfumes and want to find a specific bottle. They need direct search and easy access to price, volume, and availability.
- Both shopper groups are primary. Store operators use the private admin interface to verify payments, review stock, and follow up on eligible pending bags.

## Product Purpose

FraganUS is a Spanish-language store for Peru focused on imported Arabic perfumes. It helps shoppers find a bottle that suits them or locate one they already want, submit an order request, and track the order through shipping confirmation and payment.

## Positioning

FraganUS organizes its Arabic perfume catalog around the conditions in which shoppers in Peru will use it. Recommendations cover warm and cool climates, everyday wear, evening events, and gifts. Shoppers who know what they want can search by fragrance name, brand, or scent note.

## Operating Context

- The catalog shows product names, prices in Peruvian soles, bottle size, and scent families. Product pages add scent notes, suggested uses, and available stock.
- Shoppers explicitly select national shipping by Shalom, the sole delivery option. After receiving the request, the store confirms coverage and freight by WhatsApp and reserves available stock before sharing payment instructions. The transfer covers the products. The shopper pays freight separately to Shalom.
- Once the request is confirmed, shoppers pay with Yape or Plin and attach an image of the payment receipt. The store verifies the transfer manually. The shopper can track each stage with the order code.
- Operators verify the transfer before approving payment in the admin interface. New requests reserve units at shipping confirmation. Cancelling before payment approval releases those units. Legacy orders deduct stock at payment approval.

## Capabilities and Constraints

- Receipts support JPG, PNG, and WebP up to 8 MB and are stored privately.
- FraganUS can follow up about a pending bag by WhatsApp when the shopper explicitly opts in.
- The project is configured with a public catalog preview that disables real purchases. The local checkout supports test orders and test receipts.

## Brand Commitments

Use the name FraganUS and Peruvian Spanish for shopper-facing copy. Use soles (PEN) for prices and familiar terms such as “bolsa,” “flete,” and “comprobante.”

Use the octagonal gem with a centered F as the FraganUS symbol. In the full wordmark, fill the letters US with the United States flag.

## Evidence on Hand

- [Sample catalog and fragrance information](src/lib/catalog.ts) and [sample data](seed.sql) document the demonstration assortment and prices.
- [Storefront](src/pages/index.astro), [checkout](src/pages/checkout.astro), and [configuration and operations notes](README.md) document the current flows.
- [Featured perfume photos](public/brand/destacados) and [brand icon](public/brand/icon.svg) are available. The README records the provenance of the demo product photos and references for scent notes.

## Product Principles

1. Give guided discovery and direct search equal weight.
2. Explain fragrance in terms shoppers can use to choose, especially scent, weather, and occasion.
3. Distinguish the product amount from carrier freight and explain when the store will coordinate delivery.
4. Give shoppers a clear way to check the order from the moment they send the request.
