# Changelog

## 2026-06-07

- feat: text-adjacency classes for inline images (`preceded-by-text` / `followed-by-text`)
- style: fix `<figure>` img double padding
- style: feed-content `<figure>` to match standalone-image
- feat: inline image classification at sanitize time (three-way heuristic)
- spec: inline image classification
- test: extractText helper + Atom string content parsing
- fix: Atom feeds with string content (GitLab blog etc.)

## 2026-06-06

- fix #10: graceful favicon fallback with consistent layout
- fix #6: theme toggle icon out of sync with localStorage
- feat: cache Vite/SvelteKit versioned assets in Caddy (`@versioned` matcher)
- feat: add compression and immutable asset caching to Caddy
- feat: add Caddy for HTTPS/HTTP2 local dev
- chore: switch to svelte-adapter-bun
- docs: update .env.example with ORIGIN comments
- feat: add portless for HTTPS/HTTP2 local dev
- feat: switch link preload from hover to mousedown
- fix: eliminate JWKS DB query on every request (JWE cookieCache + disableSettingJwtHeader)
- refactor: deduplicate form actions into shared module
- fix: add error logging to correct file (+page.server.ts at /dashboard)
- fix: use console.log for addFeed error logging (was console.error)
- chore: better server-side error logging on addFeed/refreshFeed
- tweak list marker colors and li padding
- fix: ol marker color and weight
- docs: update README with feeds:refresh-all CLI
- fix: use correct DaisyUI v5 CSS variable names for light/dark mode
- feat: feed content typography with `.feed-content` class
- fix: items update on re-fetch + feeds:refresh-all --force flag
- feat: YouTube embed thumbnails + feeds:refresh-all CLI
- feat: raw content columns + DOMPurify sanitization at fetch time
- docs: add project README
- fix: theme init in app.html (no flash), title links to /dashboard
- feat: slug-based reading URLs at /dashboard/r/[feedSlug]/[itemSlug]
- feat: three-pane reading layout with sidebar, item list, content pane
- feat: feed detail page with item list, read/star toggles
- fix: sign out now calls auth.api.signOut() instead of just navigating to /login
- feat(daisyui): install daisyUI v5 and rewrite UI with daisyUI components
- chore(daisyui): add daisyUI skill
- feat: feed management UI (add/delete/refresh feeds)
- fix: login failing due to wrong providerId ('email' vs 'credential')
- test: seed+login round-trip via password hash/verify utility
- feat: seed command + login/logout UI + empty dashboard
- docs: backfill changelog with full project history
- feat(auth): sessionless JWT with bearer+jwt plugins, plural auth tables
- chore: add coding-conventions skill, pluralize DB tables, namespace scripts
- feat(rss-reader): feed fetching pipeline — fetch, parse, store
- feat(rss-reader): define core database schema with user scoping
- chore: clean up demo scaffold, keep only essentials
- feat(rss-reader): scaffold SvelteKit project with auth and Drizzle
- feat: scaffold SvelteKit project with sv
- chore(robot): add project.md skill
- chore(opencode): add @sveltejs/opencode plugin
- feat(rss-reader): add feature specification and research
- chore: install robot
- chore: first commit
