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

## Reference Implementations

Local clones of the most established open-source RSS readers live at
`~/Code/reference/rss/`. This directory is a resource for studying how other
projects solve the same problems — DB schema design, feed parsing, full-text
extraction, caching, CLI architecture, API design, mobile sync, etc.

| Repo | Language | Size | Highlights |
|---|---|---|---|
| `miniflux/` | Go | 7.6M | Minimalist, single-binary, intentional simplicity. Closest philosophical fit. Built-in readability, Fever/Reader API, privacy-first (tracking strip, media proxy). |
| `freshrss/` | PHP | 19M | Most popular self-hosted reader. Feature-rich (extensions, themes, filters). Flexible DB (SQLite/MySQL/PgSQL). |
| `tt-rss/` | PHP | 41M | Oldest (2005), most feature-dense. Three-pane UI, plugin system, complex filter chains. |
| `newsblur/` | Python | 1.2G | Social + ML features. Full-stack: Django + MongoDB + Redis + Elasticsearch + mobile apps. |
| `commafeed/` | Java | 4.5M | Quarkus + React. Google Reader API + Fever API. Supports thousands of users. |
| `newsboat/` | C++ | 8.7M | Terminal RSS reader (fork of Newsbeuter, ~2006). C++ with minimal deps. |
| `rssguard/` | C++ | 337M | Qt-based desktop reader. Also does podcasts/XMPP/Gemini. |

Browse any repo with `ls ~/Code/reference/rss/<name>` or open in the editor.

## Key Takeaways for Our Design

- Miniflux's architecture (Go binary, Postgres, minimal UI, privacy-first) is
  closest to our vision.
- Google Reader API / Fever API are the standard protocols for mobile client
  sync.
- Full-text article fetching is a must-have feature (not all feeds include full
  content).
- Privacy features (tracking removal, UTM stripping) are table stakes in 2026.
