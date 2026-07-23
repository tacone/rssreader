# Plan: RSS Reader

## Approach

Early functionality — each phase produces a working increment. Keep each phase
small: get basics working, then layer on features and refine with each pass.

---

## Phase 0 — Project scaffold

The goal is a blank SvelteKit app running on Bun with Drizzle connected to a
local PostgreSQL, and Better Auth wired up.

- [x] `npx sv create` — SvelteKit minimal + TypeScript + all add-ons
- [x] Drizzle ORM + PostgreSQL driver (postgres.js) installed
- [x] Better Auth (email/password) configured
- [x] Local Docker PostgreSQL connected, `rssreader` DB created
- [x] Auth schema generated and pushed to DB
- [x] Dev server verified: `bun dev` starts on :5173
- [ ] Clean up demo files (task schema, demo routes)
- [ ] Write first Vitest sanity test

---

## Phase 1 — Core database schema

Define the data model that everything else builds on.

- [x] Define full Drizzle schema: feeds, items, folders, feed_folders, item_tags
  - User-scoped: feeds and folders have userId FK
  - Proper indexes for all query patterns
- [x] Push schema to local PostgreSQL
  - All tables created with FKs, indexes, unique constraints
- [x] Write schema tests (5 tests passing)
- [x] Create seed script (`bun run seeds:create`)

---

## Phase 2 — Feed fetching & processing

Build the core feed pipeline: fetch → parse → sanitize → store.

- [x] Implement feed fetch function (HTTP + feedsmith parsing)
  - RSS 2.0, Atom 1.0, RDF, JSON Feed support
  - Conditional GET (ETag / Last-Modified)
  - 304 Not Modified handling
- [x] Store parsed items in DB (upsert by feed+guid, onConflictDoNothing)
  - User-scoped: requires userId for feed association
  - Updates existing feed metadata, skips duplicate items
- [x] CLI commands:
  - `feeds:refresh-all <email>` — refresh all feeds for user
  - `feeds:refresh <email> <url>` — single-feed refresh with --force
  - `feeds:recompute-all <email>` — re-extract all partial feeds
  - `feeds:recompute <email> <url>` — single-feed recompute
  - `feeds:detect-partial <email>` — detect which feeds need extraction
- [x] Unit tests for fetch module (5 tests: RSS, Atom, 304, conditional GET, HTTP error)
- [x] Manual refresh button in UI: "Refresh" per feed and "Refresh all"
- [ ] Basic error handling: failed feeds marked, retry logic

### Content sanitization

- [x] HTML sanitization via DOMPurify + jsdom at fetch time
  - Strict tag whitelist (~40 tags, ~20 attributes)
  - Raw+computed data model: `raw_*` fields stored alongside sanitized fields
- [x] HTML minification via html-minifier-terser at sanitize time

### Full-text extraction (partial feeds)

- [x] `@mozilla/readability` for extracting article content from source pages
- [x] DB columns: `is_partial_feed`, `raw_page_content`, `raw_page_error`, `not_renderable`
- [x] Detection: AND logic (text length mismatch + image basename matching)
- [x] Content preservation across refreshes (`buildItemUpdateSet` excludes `content` when `isPartialFeed=1`)
- [x] HTTP/network errors stored in `raw_page_error`; non-readerable pages set `not_renderable = 1`
- [x] `fetchPageContent`: non-HTML Content-Type skip, Content-Length > 512KB skip, null byte stripping, 500-char error truncation
- [x] Tests: 25 extract tests, 31 detect-partial tests

### Feed discovery

- [x] `src/lib/server/feed/discover.ts` — feedscout wrapper
  - SSRF protection (DNS-based private IP blocking)
  - 15s timeout
- [x] Unified add/discover flow: single URL input, auto-subscribe when 1 feed found, modal when multiple
- [x] `subscribeFromDiscover` action — one-click subscribe from modal
- [x] Deduplicate discovered URLs (strip trailing slash), sort by length (shortest first)

### Image handling

- [x] Inline image classification at sanitize time: inline-first, standalone-second, default for remainder
  - Figure guard: `isInlineImage` returns false when `img.closest('figure')`
  - Content-based inline fallback: images with no size hints + adjacent text-node siblings
  - `hasAdjacentTextNodeInChain()` walks up through inline wrappers
- [x] Picture/srcset handling: bypass inline checks → standalone (unless inside `<figure>` or `<table>`)
- [x] Broken image fallback (`brokenImage` Svelte action)
- [x] `.expandStandaloneImages` action: drop width/height when naturalWidth exceeds declared
- [x] Spec document: `specs/inline-image-classification.md`

### Video & embeds

- [x] Video tag support in sanitize whitelist
- [x] YouTube/TED iframes → marker `<a>` at sanitize time, click-to-embed

### Syntax highlighting

- [x] highlight.js integration in `sanitizeHtml` for `<pre><code>` blocks
- [x] `AUTO_LANGUAGES` restricted to 37 languages (hljs common + svelte)
- [x] CSS themes for light/dark syntax

---

## Phase 3 — Reading experience

The main UI.

- [x] Reading URL scheme: `/dashboard/r/[feed-slug]/[item-slug]`
- [x] Dashboard layout: three-pane (sidebar + item list + content pane)
  - [x] Sidebar: feed list with unread counts, add-feed form, discover input
  - [x] Content pane: item list for selected feed
  - [x] Item detail: title, content, metadata, link to original
- [x] DaisyUI v5 + Tailwind v4 for UI (CSS-only, zero JS)
- [x] Dark/light theme toggle with localStorage + blocking inline init in `app.html`
- [x] FeedIcon component with fallback (rounded translucent white square on load failure)
- [x] Favicon: standard orange RSS SVG
- [x] Project renamed to "Read RSS"; `SITE_NAME` in `src/lib/config.ts`
- [ ] Mark as read
  - [x] Per-item toggle on item detail page
  - [x] Auto-mark read on page `load` function
  - [x] Read items dimmed: `opacity-50` on link block
  - [ ] Mark all as read (per feed, per folder)
- [x] Star/unstar items
- [x] Layout refresh after navigation: `afterNavigate` + `invalidateAll()` in `[feedSlug]/+layout.svelte`
- [x] Toggle forms force layout refresh: `update()` + `invalidateAll()` via custom `handleForm`
- [x] Unread count badges: hidden when zero, `badge-ghost` when > 0
- [x] Feed management UI: add feed, discover feed, remove feed, refresh
- [ ] Item-level tagging (add/remove tags per item)
- [ ] Keyboard shortcuts (j/k navigation, m = mark read, s = star, etc.)
- [ ] Search bar: full-text search across items
- [ ] Organize feeds into folders
- [ ] OPML import

---

## Phase 4 — Polishing

- [ ] Responsive design: verify desktop + mobile layouts
- [ ] PWA: web manifest, install prompt
- [ ] Keyboard shortcuts: review and fill gaps
- [ ] Unit tests at 227 and growing
  - 130 sanitize tests, 31 detect-partial, 25 extract, 5 store, 5 schema, plus fetch, theme, etc.
- [ ] Playwright e2e: 5 tests covering auth flow

---

## Phase 5 — Deployment

- [ ] Switch adapter: `@sveltejs/adapter-cloudflare`
- [ ] Set up Neon production database
- [ ] Configure environment variables for CF Pages + Neon
- [ ] Deploy to Cloudflare Pages
- [ ] CI: run tests on PR, deploy on main

---

## Research & investigation

- [x] Feed parsing library evaluation: feedsmith chosen (TypeScript-native, 3-15x faster than rss-parser, 2000+ tests)
- [x] Reference implementations cloned: `~/Code/reference/rss/` — 7 mature open-source RSS readers (miniflux, freshrss, tt-rss, newsblur, commafeed, newsboat, rssguard)
- [x] Feed discovery approach research (miniflux cascade, freshrss SimplePie Locator, newsblur two-stage finder with SSRF protection)
- [x] Spec documents: `specs/inline-image-classification.md`, `specs/full-text-extraction.md`, `specs/partial-feed-maintenance.md`

---

## Future (post-v1)

- [ ] Background feed fetching (cron / queue)
- [ ] More keyboard shortcuts
- [ ] Infinite scroll refinement
- [ ] Custom design system polish
- [ ] Better Auth advanced features (OAuth, etc.)
- [ ] Feed discovery / suggestions
