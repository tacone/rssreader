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
