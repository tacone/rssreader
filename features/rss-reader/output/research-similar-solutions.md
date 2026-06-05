# Similar Solutions Research

## Self-Hosted RSS Readers (2026)

### Miniflux (Go + Postgres)

- Single Go binary, ~15-30MB RAM idle
- Intentional minimalism: no themes, no extensions, no social features
- Built-in full-text scraper, excellent keyboard shortcuts
- Google Reader API + Fever API → works with all mobile clients
- Built-in readability parser for full-text fetching
- Privacy-first: strips tracking pixels, removes UTM params, proxies media
- Integrations: Wallabag, Pocket, Instapaper, Pinboard, Telegram, Matrix, etc.
- **Philosophical fit**: closest to what we want — linear, minimal, fast, no
  bloat

### FreshRSS (PHP + any DB)

- Most popular self-hosted reader (14.4K GitHub stars)
- Feature-rich: extensions, themes, multi-user, filters
- PHP + Apache/Nginx → heavier (~50-100MB RAM idle)
- Google Reader API + Fever API → works with all mobile clients
- SQLite/MySQL/PostgreSQL — flexible DB options
- Web scraping for full-text, powerful filter rules

### Tiny Tiny RSS (PHP + Postgres)

- Oldest (2005), most feature-dense
- Three-pane UI, plugin system, complex filter chains
- Heavier resource usage (~80-150MB)
- Singe-maintainer project with prickly culture

### Commercial Readers

- Feedly ($8/mo): most popular, clean onboarding
- Inoreader ($7.50/mo): power-user rules and filters
- NewsBlur ($36/yr): trainable feed intelligence
- Feedbin ($5/mo): newsletter-to-RSS bridge
- Readwise Reader ($10/mo): RSS + read-later + highlights

## Key Takeaways for Our Design

- Miniflux's architecture (Go binary, Postgres, minimal UI, privacy-first) is
  closest to our vision.
- Google Reader API / Fever API are the standard protocols for mobile client
  sync.
- Full-text article fetching is a must-have feature (not all feeds include full
  content).
- Privacy features (tracking removal, UTM stripping) are table stakes in 2026.
