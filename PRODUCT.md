# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Shoppers in Peru who are new to Arabic perfumes, including people choosing a gift. They need enough context about scent, climate, and occasion to choose a bottle online.
- Shoppers in Peru who already know Arabic perfumes and want to find a specific bottle. They need direct search and easy access to price, volume, and availability.
- Both shopper groups are primary. Store operators use the private admin interface to verify payments, review stock, and follow up on eligible pending bags.

## Product Purpose

FraganUS is a Spanish-language store for Peru focused on imported Arabic perfumes. It helps shoppers find a bottle that suits them or locate one they already want, place and pay for an order, and track it through packing and dispatch.

## Positioning

FraganUS organizes its Arabic perfume catalog around the conditions in which shoppers in Peru will use it. Recommendations cover warm and cool climates, everyday wear and evening events. Shoppers who know what they want can search by fragrance name, brand, or scent note.

## Operating Context

- The catalog shows product names, prices in Peruvian soles, bottle size, and scent families. Product pages add scent notes, suggested uses, and available stock.
- Shoppers select a pickup agency in the national Shalom network by department, province, and district. They may use browser location to rank agencies. The transfer pays for the products. The carrier sets and collects the freight separately.
- Shoppers pay with Yape or Plin, attach a receipt, and track the order with their order code. The store verifies the transfer before confirming the order for packing and dispatch.
- Operators can add products, manage stock, verify transfers, and mark orders for packing or as dispatched. Checkout reserves stock for 30 minutes while waiting for the receipt.

## Capabilities and Constraints

- Receipts support JPG, PNG, and WebP up to 8 MB and are stored privately.
- FraganUS uses WhatsApp for order questions and updates. Shoppers can opt in to offers and pending bag reminders.
- The public store uses live product inventory. The local checkout supports test orders and test receipts.

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
3. Distinguish the product amount from carrier freight and explain who collects each payment.
4. Give shoppers a clear way to check the order from the moment they reach payment.
