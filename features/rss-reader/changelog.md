## 2026-07-14 (4) — Project renamed to "Read RSS"

- feat: project renamed from "RSS Reader" to "Read RSS"
- feat: `SITE_NAME` exported from `src/lib/config.ts` — single source of truth for the site name
- feat: `<title>` tag set dynamically from `{SITE_NAME}` in root layout and all pages
- feat: header branding uses `{SITE_NAME}` from config
- refactor: landing page (`/`) renders `{SITE_NAME}` with proper heading markup
- docs: README updated with new project name

## 2026-07-14 (3) — Content-based inline fallback for images with no size hints

- fix: images without any dimension signals (no height attr, no URL dimension pattern, no query param height) and with direct text-node siblings are now classified as inline — catches SVG icons and other small images embedded in article text
- test: 4 new tests covering text-adjacent inline fallback, including preceded-only, followed-only, and sole-child regression
- fix: narrows text-adjacency check to direct text-node siblings only (not element siblings with text content) to avoid corrupting standalone classification of element-surrounded images

## 2026-07-14 (2) — Tighten inline image classification: figure guard + bounded dimension regex

- fix: `INLINE_DIMENSION_RE` regex `/\d{1,3}x\d{1,2}/` matched substrings of larger dimension numbers (e.g. `1024x79` within `1024x798`) — false-positive inline classification for hero/content images
- fix: new regex `/(?:^|[^0-9])\d{1,2}x\d{1,2}(?=[^0-9]|$)/` with non-digit boundaries on both sides, matching only 1–2 digit widths (`74x43`, `32x32`) — no false positives on `1024x798`, `200x30`, `256x256`
- fix: `isInlineImage()` now returns `false` when `img.closest('figure')` is truthy — `<figure>` provides its own block layout; prevents inline heuristics from breaking figure-styled images
- test: 5 new tests covering figure guard, `1024x798` not inline, `74x43` still inline, `32x32` still inline, `200x30` not inline

## 2026-07-14 — Content preservation on refresh, shared CLI logic, re-extraction from raw_page_content

- fix: `onConflictDoUpdate` no longer overwrites `items.content` with feed summary on partial-feed refresh — extracted full content is preserved across refreshes
- feat: shared `refreshSingleFeed()` in store.ts — per-feed refresh with cache-aware fetch, detection, and page-content fetching; used by both `feeds:refresh-all` and `feeds:refresh`
- feat: `feeds:refresh <email> <url>` — refresh a single existing feed (with optional `--force`), replaces removed `feeds:fetch`
- feat: shared `recomputeSingleFeed()` in store.ts — per-feed recompute; used by both `feeds:recompute-all` and `feeds:recompute`
- feat: `feeds:recompute <email> <url>` — recompute a single existing feed
- feat: for partial feeds, `recomputeSingleFeed` re-extracts `items.content` from stored `raw_page_content` using Readability (instead of re-sanitizing the feed summary)
- fix: detection runs before `upsertFeed` so the `isPartialFeed` flag is available for the item upsert — no more chicken-and-egg bug where first batch of items skipped page fetching
- refactor: `buildItemUpdateSet()` extracted as pure, testable function — conditionally excludes `content` from `onConflictDoUpdate.set` when `isPartialFeed=1`
- dep: removed `feeds:fetch` / `cli.ts` (replaced by `feeds:refresh` + `feeds:refresh-all`)

## 2026-06-08 (2) — Full-text extraction for partial feeds

- feat: `@mozilla/readability` integration for automatic detection of partial/summary-only feeds and full-content extraction
- feat: `feeds.is_partial_feed`, `items.raw_page_content`, `items.raw_page_error`, `items.not_renderable` columns added to schema
- feat: 5/3 detection heuristic — fetches first 5 article URLs at add time, compares Readability-extracted text length vs feed content, marks feed as partial if 3+ differ significantly (>2x or >+500 chars)
- feat: `feeds:detect-partial <email>` CLI command to (re-)detect partial feeds for all feeds of a user
- feat: on refresh, partial feeds fetch `raw_page_content` + run `isProbablyReaderable()` + `Readability.parse()` + sanitize pipeline per item; skips already-fetched items
- feat: extraction failures and non-readerable results are logged as road bumps (`raw_page_error`, `not_renderable`)
- feat: `extractFromPage()`, `compareContentLength()`, `getTextContent()` utilities in `src/lib/server/feed/extract.ts`
- dep: `@mozilla/readability@0.6.0` installed

## 2026-06-08 (1) — Standalone image width expansion, <mark> styling, auto-detection restricted

- feat: new `expandStandaloneImages` action drops `width`/`height` on standalone images when their `naturalWidth` exceeds the declared width
- style: `.feed-content mark` styled with yellow highlight background
- feat: `AUTO_LANGUAGES` constant restricts `highlightAuto` to 37 languages (hljs "common" subset + svelte) instead of all ~197 — faster, fewer false positives
- fix: images with `srcset` or inside `<picture>` no longer classified as standalone when inside a `<table>` — `hasTableAncestor` check added to the srcset/picture override path
- style: item rows gain `ml-1 border-l-4` with `border-l-accent` for selected, `border-l-transparent` otherwise (#16)
- fix: item detail pane scrolls to top on navigation between items (#15)
- fix: SVG images alongside text in `<p>` are now classified as inline-image
- feat: HTML minification via `html-minifier-terser` at sanitize time — `collapseWhitespace`, `removeComments`, `collapseBooleanAttributes`, `removeEmptyAttributes`, `decodeEntities`; `srcset` values preserved via `ignoreCustomFragments`

## 2026-06-07 — atom-one-light / atom-one-dark syntax themes

- style: switched from `github` to `atom-one-light` (default light) + `atom-one-dark` (scoped under `[data-theme="dark"]`) for syntax highlighting theme

## 2026-06-07 — Language detection from CSS classes, relevance threshold

- feat: `highlightCodeBlocks` checks `<pre>` (and sole-child `<code>`) classes for language hints before `highlightAuto`
- Priority: `language-*` prefixed classes → bare class names (`getLanguage`) → auto-detection
- Uses `getLanguage().name` resolved via registration-key map so `hljs.highlight()` works correctly (fixed `"Shell Session"` crash)
- Explicit language class sets `data-relevance="9999"` (guaranteed to outrank auto-detection)
- Auto-detection with relevance < 12 skips highlighting (no `hljs-` spans) but still sets `language-*` class and `data-relevance` attribute
- 11 new/updated tests, 152 total

## 2026-06-07 — feeds:recompute-all CLI command

- feat: `feeds:recompute-all <email>` re-applies sanitization pipeline to all existing items from their raw fields, without refetching — picks up changes in sanitization logic (syntax highlighting, URL resolution, etc.)
- Run with `bun run feeds:recompute-all <email>` or `npm run feeds:recompute-all -- <email>`

## 2026-06-07 — Syntax highlighting at fetch time, relative URL resolution

### Syntax highlighting
- feat: all `<pre>` blocks are syntax-highlighted at fetch time using highlight.js `highlightAuto`
- Plain-text `<pre>` and `<pre><code>` sole-child patterns get highlighted; `<pre>` with other child elements are skipped
- Detected language added as `language-*` class on `<pre>`, relevance score as `data-relevance` attribute
- `github` hljs theme imported in `layout.css`
- 8 new tests, 145 total

### Relative URL resolution
- feat: relative URLs in feed content (`src`, `href`, `poster`, `srcset`) resolved against the feed URL at sanitize time — no more broken image/links from relative paths
- `sanitizeHtml(html, baseUrl?)` accepts optional base URL; store passes the feed URL

## 2026-06-07 — Atom date fallback, broken image replacement, figcaption

- fix: Atom entries with only `<updated>` (no `<published>`) now get a date — fall back to `updated`, or use the earlier of both when present (jvns.ca feed)
- feat: broken images replaced client-side with a structured `.broken-image` placeholder showing "broken image" label + alt text; standalone images get `.broken-standalone-image` (block, centered)
- feat: `brokenImage` Svelte action with MutationObserver — handles `{@html}` content updates
- style: figcaption uses `color-mix(--color-base-content 60%)` instead of `--color-neutral` (was invisible in some themes)
- style: figure with figcaption gets no bottom padding; figcaption gets `margin: 1em 0`

## 2026-06-07 — picture/srcset unconditional standalone, video, text-adjacency, figure styling

- feat: images with `srcset` attribute or inside `<picture>` are always standalone (unless inside `<figure>`), overriding inline triggers
- feat: preserve `<video>` elements with `controls` forced, `poster` allowed, `autoplay` stripped by DOMPurify
- feat: inline images now get `.preceded-by-text` / `.followed-by-text` when adjacent to visible text content (scan walks up through transparent wrappers, stops at `<br>`)
- style: `.feed-content <figure>` styled to match `.standalone-image` (block, centered, rounded, background, padding)
- style: fix `<figure>` img double padding

## 2026-06-07 — Spec + tests + implement: inline image classification

- docs: `features/rss-reader/specs/inline-image-classification.md` — comprehensive spec for classifying feed images as standalone (centered block) vs inline (text-height) at sanitize time
- Three-way classification: inline-first (by height, URL patterns, `<pre>`, whitelist), standalone-second (sole child, surrounded by boundaries), and default (remainder, e.g. `<figure>`, consecutive images)
- Heuristic based on research of Miniflux, NetNewsWire, NewsBlur image handling

## 2026-06-06 — Fix Atom feeds with string content (GitLab blog)

- fix: `extractText()` helper handles feedsmith's `<content>`/`<summary>` returned as bare string (not `{ value }`) — GitLab, GitHub, and other Atom feeds now show article content
- test: `extractText` unit tests (string, object, undefined, empty object)
- test: Atom string content (GitLab-style) and object content feed parsing tests
- Existing GitLab items need re-fetch: `bun run feeds:refresh-all --force <email>`

## 2026-06-06 — Fix #10: graceful favicon fallback + Fix #6: theme icon sync

- fix: wrap feed favicon in a fixed-size `<span>` placeholder — maintains consistent flex alignment whether icon is present, missing, or unloadable
- fix: add `onerror` handler to hide broken favicon images without collapsing the layout
- fix: initialize `theme` state from `localStorage` (via `browser` guard) instead of hardcoding `'light'`

## 2026-06-06 — Caddy: immutable caching for Vite versioned assets

- feat: add `@versioned` Caddy matcher — `?v=/`?t=` query params on `/node_modules/*`, `/.svelte-kit/*`, `/src/*` → `Cache-Control: public, max-age=31536000, immutable`
- Prevents 304 round-trips for Vite/SvelteKit cache-busted files in dev mode

## 2026-06-06 — Bun adapter, portless, preload tap, JWKS fix

- chore: switch from @sveltejs/adapter-auto to svelte-adapter-bun (Bun-native adapter recommended by official docs; reverts Cloudflare deployment plan)
- feat: add portless dev dependency + `dev:portless` script for HTTPS/HTTP2 on localhost
- feat: switch link preload from hover to mousedown (`data-sveltekit-preload-data="tap"`)
- docs: update .env.example with ORIGIN comments

### Fix #7 — JWKS query on every request

- Changed `cookieCache.strategy` from `'jwt'` to `'jwe'` (A256CBC-HS512 symmetric encryption) — JWKS switch alone didn't eliminate the query
- Added `jwt({ disableSettingJwtHeader: true })` — the JWT plugin was hooking into `getSession` to generate a `set-auth-jwt` header, which requires fetching the latest JWKS key for signing. Disabling this prevents that.
- JWT plugin stays for API token generation via `/api/auth/token`

### Preload tap

- Changed `data-sveltekit-preload-data` from `"hover"` to `"tap"` — preloading starts on mousedown/touchstart instead of hover

### Portless

- Added `portless` dev dependency
- Added `dev:portless` script — `portless rssreader bun run dev`
- Updated `.env` `ORIGIN` to `https://rssreader.localhost`

## 2026-06-06 — Fix DaisyUI v5 variable names + light mode

- Fixed all `.feed-content` CSS to use correct DaisyUI v5 variable names (`--color-base-content`, `--color-primary`, `--color-accent`, `--color-base-200`, etc.) instead of short aliases (`--bc`, `--p`, `--b2`) that don't exist
- Alpha values now use `color-mix()` since variables are full `oklch()` values
- All styles now work in both light and dark mode
- Links use accent color at 70% opacity, disc markers use text color
- Bullet lists, blockquote border, broken image placeholder all visible in both themes

## 2026-06-06 — Feed content typography

- Feed content now styled with `.feed-content` class: proper heading sizes, link colors, blockquote border, code/pre blocks with monospace, tables, horizontal rules, responsive images, figure/figcaption, details/summary
- Uses DaisyUI theme tokens (`--bc`, `--p`, `--nc`, `--b2`) for dark mode compatibility
- Replaces `prose` class (requires `@tailwindcss/typography`, not v4-compatible)

## 2026-06-06 — onConflictDoUpdate + feeds:refresh-all --force

- Items now update on re-fetch (`onConflictDoUpdate` instead of `onConflictDoNothing`) — picks up sanitizer changes, retains read/star state
- `feeds:refresh-all` CLI: `--force` flag to ignore etag/lastModified
- Output now distinguishes `refreshed` vs `cached` (304)
- Embed thumbnails now work retroactively after `--force` refresh

## 2026-06-06 — YouTube embed thumbnails + feeds:refresh-all CLI

- YouTube/TED iframes in feed content are now converted to thumbnail links at sanitize time (DOMPurify preprocessing)
- Click a thumbnail to load the actual iframe (click-to-embed) via `RssEmbedHandler` component
- Play button overlay on embed thumbnails (CSS pseudo-element with hover effect)
- New `feeds:refresh-all <email>` CLI command to refresh all feeds for a user

## 2026-06-06 — Raw content columns + DOMPurify sanitization

- Added `raw_title`, `raw_summary`, `raw_content` columns to `items` table
- `title` and `summary` now computed from raw fields at fetch time (strip tags + decode entities via `he`)
- `content` sanitized with DOMPurify + jsdom (Miniflux-style strict whitelist, ~40 tags)
- `htmlToText()` utility for stripping tags + converting HTML entities
- 30 unit tests for sanitization (XSS vectors, real feed HTML)
- Fixed `he` import compatibility (CJS default import for Vite SSR)

## 2026-06-06 — Theme no-flash + Title link

- Theme initialization moved from `+layout.svelte` `onMount` to blocking inline `<script>` in `app.html` — no flash of wrong theme on load
- "RSS Reader" title in reading-view header now links to `/dashboard`

## 2026-06-06 — Slug-based Reading URLs + Routing Refactor

- Removed `/feeds/[id]` route (replaced by `/dashboard/r/`)
- Added `slug` column to `feeds` and `items` tables (nullable → backfilled → NOT NULL + unique indexes)
- Slug format: `kebab-case-title-XXXXXXXX` where suffix is last 8 chars of UUID; falls back to URL domain if no title
- New reading route: `/dashboard/r/[feedSlug]/[itemSlug]` with nested layout hierarchy
  - Outer layout: sidebar (feeds with unread counts) + header (dark-mode toggle, sign out, refresh all)
  - Feed layout: center item list (200 items, most recent first)
  - Item page: right content pane with read/star toggles
- `/dashboard` simplified to feed management only, with "Start Reading" link to `/dashboard/r/`
- Floating dark-mode toggle moved into `/dashboard/r/` header bar
- Slug utility with 12 tests (kebab conversion + generateSlug edge cases)
- Updated login e2e test for new heading

## 2026-06-06 — Three-Pane Reading Layout

- Dashboard rewritten as three-pane layout (CSS grid):
  - Left sidebar: feed list with unread counts, add-feed form
  - Center: item list for selected feed (ordered by publishedAt desc, limited to 200)
  - Right: content pane for selected item (rendered HTML)
- Navigation via URL search params: `?feed=<id>&item=<id>`
- `feeds` load includes unread count per feed (SQL subquery)
- `toggleRead` / `toggleStar` server actions moved to dashboard
- Feeds ordered by title (case-insensitive)

## 2026-06-06 — Feed Detail Page (Reading started)

- `/feeds/[id]` route — shows all items for a feed, ordered by publishedAt desc
- Each feed card on dashboard links to its feed detail page
- Inline item expand: click title to reveal full content (HTML rendered)
- `toggleRead` / `toggleStar` server actions on feed detail page
- Read/unread badge, star toggle (★/☆) per item

## 2026-06-06 — DaisyUI + Logout Fix

- Installed daisyUI v5, integrated as Tailwind v4 plugin (`@plugin "daisyui"` in layout.css)
- Theme toggle (light/dark) with localStorage persistence, sun/moon icons
- All pages (login, signup, dashboard) rewritten with DaisyUI components (hero, card, btn, input-bordered, form-control, alert, join, link)
- **Bugfix**: "Sign Out" was a plain `<a>` link — didn't clear session. Changed to form POST with `auth.api.signOut()` server action.

## 2026-06-06 — Feed Management UI (POC)

- Dashboard load function returns user's feeds (id, url, title, siteUrl, icon, lastFetchedAt, errorCount)
- `addFeed` form action: validates URL, checks for duplicates, fetches + stores feed via existing pipeline
- `deleteFeed`, `refreshFeed`, `refreshAll` form actions on dashboard
- Dashboard UI: add-feed form with URL input, feed list with icon/title/URL/refresh date, Refresh/Refresh All/Delete buttons
- Form actions use SvelteKit `use:enhance` for progressive enhancement

## 2026-06-06 — Login Fix + Playwright Tests

- **Bugfix**: seed script created accounts with `providerId: 'email'` instead of `'credential'` (and `accountId` as email instead of user ID). Login silently rejected valid credentials despite correct password hash.
- Form action: login page now uses SvelteKit server action (`auth.api.signInEmail`) instead of client-side proxy — more reliable, works without JS.
- 5 Playwright e2e tests for login flow: API returns token, UI submits + redirects, invalid creds show error, auth redirect guards, unauth redirect guards.

## 2026-06-06 — Seed + Auth UI + Password Tests

- `bun run seeds:create` — standalone script to create a user (scrypt hashing via Node.js crypto, matches better-auth format)
- Password utility (`src/lib/server/seed/password.ts`) — `hashPassword` + `verifyPassword` extracted for reuse
- 6 password round-trip tests: hash+verify, wrong password rejection, unique salts, key length, malformed hash, Unicode normalization
- Login page at `/login`, sign-up page at `/signup`
- Protected dashboard at `/dashboard` (redirects to `/login` if unauthenticated)
- Auth client (`$lib/auth-client.ts`) using `better-auth/svelte`
- Homepage (`/`) redirects to `/dashboard`
- Redirect already-authenticated users away from login/signup pages

## 2026-06-05 — Auth — Sessionless JWT + Plural Auth Tables

- Bearer + JWT plugins for sessionless auth (bearer token, JWKS endpoint)
- Cookie cache with JWT strategy (avoids DB on session lookups)
- Pluralized auth table names: `users`, `sessions`, `accounts`, `verifications`
- `jwks` table added (JWT plugin)
- Fixed double-pluralization bug in generated auth schema relations
- Added `coding-conventions.md` skill (CRITICAL): plural tables, colon-namespaced scripts

## 2026-06-05 — Conventions — Coding Standards

- New CRITICAL skill: `robot/skills/coding-conventions.md`
- DB tables use plural names (`feeds`, `items`, `folders`, etc.)
- `package.json` scripts colon-namespaced (`feeds:fetch`, `db:push`)
- Renamed `feed_folder` → `feed_folders`, `item_tag` → `item_tags`
- Renamed `fetch-feeds` → `feeds:fetch`

## 2026-06-05 — Feed Pipeline — Fetch, Parse, Store (Phase 2)

- `fetchFeed()` with feedsmith — RSS 2.0, Atom 1.0, RDF, JSON Feed
- Conditional GET (ETag/Last-Modified), 304 handling
- `upsertFeed()` stores feed metadata + items to DB (user-scoped)
- CLI: `bun run feeds:fetch <url>` — standalone, no SvelteKit dependency
- 5 unit tests for fetch module (RSS, Atom, 304, conditional GET, HTTP error)

## 2026-06-05 — Database Schema — Core Tables (Phase 1)

- `feeds`, `items`, `folders`, `feed_folder`, `item_tag` + auth schema pushed to DB
- User-scoped: feeds and folders reference user via FK
- Indexes on feed+user, feed+guid, read status, starred, published date
- Schema structure tests (5 passing)

## 2026-06-05 — Scaffold — SvelteKit + Auth + ORM (Phase 0)

- Project scaffolded with `npx sv create` (minimal, TypeScript, SvelteKit)
- Add-ons installed: prettier, eslint, vitest, playwright, tailwindcss v4, drizzle, better-auth
- Better Auth configured (email/password, SvelteKit adapters)
- Docker PostgreSQL container (`postgres18`, port 5432)
- Demo files cleaned up, Vitest verified (5 tests passing)
- `.env` with DATABASE_URL, BETTER_AUTH_SECRET, ORIGIN

## 2026-06-05 — Spec Complete

Full specification compiled. Research for DB, deployment, and similar solutions
saved to `output/`.

- Compiled `feature.md` with full spec (5 sections, 20+ sub-sections)
- Research saved: database, deployment, similar solutions
- Technologies decided: SvelteKit SSR + Bun, Drizzle, Better Auth, Neon (PG),
  Cloudflare Pages

## 2026-06-05 — Feature Created

Feature folder created. Beginning spec interview.

- Created feature structure
- Loaded draft-specs skill
