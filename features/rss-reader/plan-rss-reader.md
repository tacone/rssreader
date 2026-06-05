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

## Phase 2 — Feed fetching

Build the core feed pipeline: fetch → parse → store.

- [x] Implement feed fetch function (HTTP + feedsmith parsing)
  - RSS 2.0, Atom 1.0, RDF, JSON Feed support
  - Conditional GET (ETag / Last-Modified)
  - 304 Not Modified handling
- [x] Store parsed items in DB (upsert by feed+guid, onConflictDoNothing)
  - User-scoped: requires userId for feed association
  - Updates existing feed metadata, skips duplicate items
- [x] CLI command: `bun run fetch-feeds <url>`
  - Standalone script (no SvelteKit dependency)
  - Looks up first user for feed association
- [x] Unit tests for fetch module (5 tests: RSS, Atom, 304, conditional GET, HTTP error)
- [x] Manual fetch button in UI: "Refresh" per feed and "Refresh all"
- [ ] Basic error handling: failed feeds marked, retry logic

---

## Phase 3 — Reading experience

The main UI.

- [ ] Dashboard layout:
  - Sidebar: folder tree (expandable, with unread counts)
  - Content pane: infinite-scrolling item list
  - Item detail: title, content, metadata, link to original
- [ ] Mark as read (click / scroll / keyboard)
- [ ] Mark all as read (per feed, per folder)
- [ ] Star/unstar items
- [ ] Item-level tagging (add/remove tags per item)
- [ ] Keyboard shortcuts (j/k navigation, m = mark read, s = star, etc.)
- [ ] Search bar: full-text search across items
- [ ] Feed management UI: add feed, remove feed, organize into folders
- [ ] OPML import

---

## Phase 4 — Polishing

- [ ] Responsive design: verify desktop + mobile layouts
- [ ] PWA: web manifest, install prompt
- [ ] Keyboard shortcuts: review and fill gaps
- [ ] Unit tests for remaining business logic
- [ ] Playwright e2e: login, add feed, view items, mark read

---

## Phase 5 — Deployment

- [ ] Switch adapter: `@sveltejs/adapter-cloudflare`
- [ ] Set up Neon production database
- [ ] Configure environment variables for CF Pages + Neon
- [ ] Deploy to Cloudflare Pages
- [ ] CI: run tests on PR, deploy on main

---

## Future (post-v1)

- [ ] Background feed fetching (cron / queue)
- [ ] Full-text article extraction (Readability / Defuddle)
- [ ] More keyboard shortcuts
- [ ] Infinite scroll refinement
- [ ] Custom design system polish
- [ ] Better Auth advanced features (OAuth, etc.)
- [ ] Feed discovery / suggestions
