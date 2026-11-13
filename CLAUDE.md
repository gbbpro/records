# CLAUDE.md — Records / Videos / Comics Store

This file is read by Claude Code at the start of every session. Keep it current.

## What we're building
An online store for used and collectible **vinyl records, videos (VHS/DVD/Blu-ray/4K), and comic books**.

- Catalog size: **1,000–4,000 items**, mostly **one-of-a-kind** (quantity = 1).
- Sold on **two channels**: this website and **eBay**. Our database is the single source of truth.
- The store owner (non-developer, likely on **Windows**) manages inventory through an **admin area in the browser**.

## Stack (decided — don't swap without asking)
| Concern | Choice |
|---|---|
| Framework | Next.js (App Router, TypeScript strict, Server Components by default) |
| UI | Tailwind CSS + shadcn/ui |
| Hosting | Vercel (production + preview deploy per PR) |
| Database | Postgres (Neon) + Drizzle ORM + drizzle-kit migrations |
| Auth | Clerk — customers optional (guest checkout allowed); `admin` role required for /admin |
| Payments | Stripe Checkout + webhooks + Stripe Tax |
| Shipping | Shippo (rates + labels; USPS Media Mail is the default for records/videos/comics) |
| Images | Vercel Blob (multiple condition photos per item) |
| Email | Resend + React Email |
| Marketplace | eBay Sell APIs (Inventory, Fulfillment, Notification) |
| Search | Postgres full-text search (revisit Meilisearch only if needed) |
| Tests | Vitest (unit/integration), Playwright (end-to-end), Stripe CLI, `@clerk/testing` |
| CI | GitHub Actions |

Hostinger: domain + business email only. Not used for app hosting.

## Domain rules (important)
1. **One-of-a-kind inventory.** Every item has a `status`: `draft → listed → reserved → sold` (or `withdrawn`).
   - Reserving an item must be atomic: `UPDATE items SET status='reserved' ... WHERE id=$1 AND status='listed' RETURNING *`. If no row is returned, someone else got it.
   - Reservations expire (default 30 min, matching the Stripe Checkout session expiry). Expired → back to `listed`.
   - Only the Stripe `checkout.session.completed` webhook moves an item to `sold`. Never trust the client.
2. **eBay sync must prevent double-selling.**
   - Sold/reserved on site → withdraw the eBay offer immediately.
   - Sold on eBay → mark the item `sold` on site and cancel any open reservation.
   - eBay order notifications are primary; a Vercel Cron poll of the Fulfillment API (every 5 min) is the fallback.
   - Every sync action is written to a `channel_events` log table and must be **idempotent** (safe to run twice).
3. **Condition grading is first-class data.**
   - Records: Goldmine scale for **media** and **sleeve** separately (M, NM, VG+, VG, G+, G, F, P).
   - Comics: `raw` grade (e.g. 9.4 / NM) or `slabbed` with grading company (CGC/CBCS) + cert number.
   - Videos: format (VHS, DVD, Blu-ray, 4K UHD), region, sealed/opened.
4. **Money is integer cents.** Never floats.
5. **Catalog enrichment** (later phase): Discogs API (records), Comic Vine / GCD (comics), TMDB (video). Imported data is a suggestion the owner confirms — never auto-publish.

## Cross-platform rules (owner is on Windows)
- npm scripts must work on Windows, macOS and Linux: no `rm -rf`, `&&`-chains of Unix tools, or bash-only syntax. Use Node scripts or `cross-env` / `rimraf`.
- No path assumptions (`path.join`, not string concatenation with `/`).
- Anything the owner does day-to-day happens in the browser admin, not a terminal.

## Commands
```
npm run dev            # local dev server
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm run test           # vitest (unit + integration)
npm run test:e2e       # playwright
npm run db:generate    # drizzle-kit generate (create migration)
npm run db:migrate     # apply migrations
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## How we work (non-negotiable)
1. **Plan first.** For any feature bigger than a small fix, use the `planner` agent and get my OK before writing code.
2. **Tests first.** The `test-writer` agent writes failing tests that describe the feature, then we implement.
3. **Definition of done** — a task is not done until all of these pass locally:
   `npm run lint && npm run typecheck && npm run test` (+ `npm run test:e2e` for anything touching checkout, admin, or eBay sync).
   Say which commands you ran and their result. Never claim tests pass without running them.
4. **Never weaken a test to make it pass.** If a test seems wrong, stop and explain.
5. **Review before commit.** Run the `reviewer` agent on the diff before every commit touching payments, auth, inventory, or eBay.
6. **Small commits** on a feature branch; open a PR so CI + a Vercel preview run. Never push to `main` directly.
7. **Secrets** live in `.env.local` (never committed). Keep `.env.example` updated with every new variable name.
8. Use **test/sandbox modes only** in development: Stripe test keys, Clerk dev instance, eBay **sandbox**.

## Sub-agents (in .claude/agents/)
| Agent | Use it for |
|---|---|
| `planner` | Breaking a feature into steps + test cases. Read-only. |
| `test-writer` | Writing failing Vitest/Playwright tests before implementation. |
| `commerce-backend` | Schema, migrations, inventory state machine, Stripe, orders, Shippo. |
| `ebay-sync` | Everything eBay: OAuth, listing/withdrawing offers, order ingestion, cron. |
| `ui-builder` | Storefront + admin pages and components, accessibility, responsive layout. |
| `reviewer` | Security / correctness review of a diff. Read-only. |

## Build phases
1. **Foundation** — repo, Next.js, Tailwind/shadcn, Drizzle + Neon, Clerk, CI pipeline, first passing test.
2. **Catalog** — item schema (with grading), admin CRUD + photo upload, storefront browse/filter/search, item page.
3. **Checkout** — cart, atomic reservation, Stripe Checkout, webhook → sold, order emails, reservation expiry cron.
4. **Shipping & orders** — Shippo rates at checkout, label purchase in admin, order status page.
5. **eBay** — sandbox OAuth, push listings, withdraw on site sale, ingest eBay orders, reconciliation report.
6. **Enrichment & polish** — Discogs/Comic Vine/TMDB lookup in admin, SEO, bulk CSV import, monitoring (Sentry).

Current phase: **1 — Foundation**
