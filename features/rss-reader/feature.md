# RSS Reader — Specification

## 1. Motivation & Context

A personal RSS reader built as a pet project. The goal is to create something
fast, tiny in code size, and smart in its tech choices — while learning a
replicable process for starting projects from zero.

### 1.1 Why Build vs Use Existing

Existing readers are either too simple or too complex/confusing. Most problems
stem from the commercial nature of existing software (bloat, tracking,
algorithmic feeds). No existing reader has ever clicked.

**Reference implementations** are cloned at `~/Code/reference/rss/` — a resource
for studying how mature projects solve DB schema, feed parsing, full-text
extraction, CLI architecture, API design, and mobile sync. See
`output/research-similar-solutions.md` for the full list.

### 1.2 What Google Reader Got Right

- **Linear feed** — chronological, no algorithm. Infinite scroll is nice-to-have
  for v1.
- **Folder & feed triage** — browse by category folder or individual feed.
- **Read/unread workflow** — core driver of the reading experience.
- **Custom keyboard shortcuts** — our own design (not a clone).
- **Similar layout** — but a different design system.
- **No social features** — no sharing, no notes, no comments.

### 1.3 Pet Project Goals

- **Process learning** — learn how to go from zero to first release.
- **Replicable methodology** — discover what specs and investigations are
  needed, so the process is repeatable for future projects.
- **Documentation discipline** — all investigations and decisions live in
  feature folders, in plain English.

## 2. Core UX / Reading Experience

### 2.1 Unopinionated UI

The UI presents data and lets the user choose their own workflow — no enforced
behavior.

- **2.1.1 Sidebar** — category tree (folders/categories) for navigation.
- **2.1.2 Content pane** — infinite scroll for browsing items.
- **2.1.3 Search bar** — positioned at the top of the UI. Full-text search
  across articles.
- **2.1.4 Starred items** — favorites/bookmarks feature.
- **2.1.5 Tagging** — item-level tags for organization.

### 2.2 Performance on Slow Connections

Fast as reasonably possible. No hard targets — just a commitment to performance
as a feature.

### 2.3 Responsive Design

Works well on both desktop and mobile.

### 2.4 PWA

Yes to installability (manifest), no to offline mode (v1). Just the basic PWA
wrapper.

## 3. Technical Philosophy, Stack & Deployment

### 3.1 SvelteKit (SSR)

Server-side rendered. Bun as the runtime.

### 3.2 Drizzle ORM

TypeScript ORM with SQL-like query builder. Standard setup — schema in
TypeScript, Drizzle Kit for migrations.

### 3.3 Better Auth (Sessionless JWT)

Standard Better Auth configuration with sessionless JWT tokens.

### 3.4 Database: Neon (PostgreSQL)

Managed serverless PostgreSQL. Scale-to-zero (free when idle). HTTP driver for
edge compatibility. Full-text search support for the search bar. Drizzle
integration is first-class. Free tier: 0.5GB storage.

### 3.5 Deployment: Cloudflare Pages

SvelteKit SSR deployed on Cloudflare Pages (edge). Development uses Bun +
standard SvelteKit tooling — the adapter swaps to `@sveltejs/adapter-cloudflare`
for production. No Wrangler needed during development.

### 3.6 Dev Environment

- **No Docker** — local PostgreSQL instance, `.env` points to it.
- **Standard SvelteKit dev** — `bun dev` with hot reload.
- **No Cloudflare Wrangler** — pure Bun for local development.
- **No seed data required** — can add sample feeds manually if needed.

### 3.7 Investigation of Similar Solutions

Research saved to `output/research-similar-solutions.md`. Reference solutions:

- **Miniflux** (Go + Postgres) — minimalist, fast, privacy-first. Closest
  philosophical fit.
- **FreshRSS** (PHP + any DB) — feature-rich, most popular self-hosted reader.
- **Tiny Tiny RSS** (PHP + Postgres) — power-user oriented, dense UI.
- Commercial: Feedly, Inoreader, NewsBlur, Feedbin, Readwise Reader,
  NetNewsWire.

## 4. Feed Fetching Strategy

### 4.1 Fetch Function

Core module that fetches and parses RSS/Atom feeds. Handles HTTP requests, XML
parsing, error handling, conditional GET (ETag/Last-Modified).

### 4.2 CLI Command

Expose feed refresh as a CLI command that can be run manually or scheduled via
cron/at/systemd timer.

### 4.3 UI Button

Manual refresh trigger — per-feed and/or "refresh all" in the UI.

### 4.4 No Background Processing for v1

No queues, workers, or background jobs. Simplicity first. Can be added post-v1
if needed.

### 4.5 Investigate Existing Solutions for Feed Parsing

Research saved to `output/research-feed-parsing.md`. Key findings:

- **rss-parser** (~700k weekly) is the dominant library in the ecosystem.
  Promise-based, uses xml2js. Slowest option but most documented.
- **feedsmith** (588 ★) is the most compelling modern alternative: TypeScript-native,
  3-15x faster than rss-parser, supports RSS/Atom/RDF/JSON Feed/OPML.
  Uses fast-xml-parser internally. 2000+ tests.
- **feedparser** (streaming, sax.js) and **@rowanmanning/feed-parser** are both
  tested against real-world malformed feeds — useful for resilience.
- Most existing SvelteKit RSS readers use rss-parser. MertNews uses it alongside
  fast-xml-parser. NewsDiff uses rss-parser + Defuddle + Readability for full-text.
- For full-text extraction (when feed has only summary): @mozilla/readability or
  Defuddle — both require fetching the original article page.

## 5. Testing Strategy

### 5.1 Comprehensive Unit Tests

Vitest — test data access layer, feed parsing, auth, and business logic. Focus
on reliability of the core feed pipeline.

### 5.2 Limited Playwright E2E

A small set of Playwright tests covering critical user paths (load feeds, mark
read, navigate categories) — enough for confidence, not exhaustive coverage.
