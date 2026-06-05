# Feed Parsing & Fetching — Research

## JS/TS Feed Parsing Libraries

| Library                       | Stars / Downloads    | Approach                                   | Notes                                                                                                            |
| ----------------------------- | -------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **rss-parser**                | ~700k weekly, 1.5k ★ | Promise-based, xml2js backend              | Most popular, safe choice. Last release Apr 2023 (v3.13.0). Slower than alternatives.                            |
| **feedparser**                | ~30k weekly          | Streaming, event-driven (sax.js)           | Handles malformed feeds well. Resolves relative URLs. Very mature (2011). Updated May 2026.                      |
| **feedsmith**                 | 588 ★                | TypeScript-native, fast-xml-parser backend | New (2025). Claims 3-15x faster than rss-parser in benchmarks. RSS/Atom/RDF/JSON Feed/OPML. 2000+ tests. Active. |
| **@rowanmanning/feed-parser** | Small                | Simple parseFeed() + fetch                 | Tested against 40+ real-world feeds. Lenient. No URL fetching built-in.                                          |
| **feedparser-rs**             | New (2025)           | Rust native addon                          | 90-100x faster than Python feedparser. Adds Rust build dependency.                                               |
| **fast-xml-parser**           | ~3M weekly           | General XML parser                         | Not RSS-specific, but very fast. Used internally by feedsmith.                                                   |

## Existing SvelteKit-Based RSS Readers

| Project                            | Stack                             | Feed Parsing                 | Notes                                                                    |
| ---------------------------------- | --------------------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| **ZIB** (faulander/zib)            | SvelteKit + Bun + SQLite          | —                            | Best stack match to ours. New (Jan 2026).                                |
| **MertNews** (tahsinmert/MertNews) | SvelteKit SSR                     | rss-parser + fast-xml-parser | Apple-inspired UI, 40+ feeds. Most relevant usage of rss-parser.         |
| **NewsDiff** (rmdes/newsdiff)      | SvelteKit + Drizzle + PG + BullMQ | rss-parser                   | Also uses Defuddle + Readability for full-text extraction. Vitest tests. |
| **Clairvue** (daniel-lxs/clairvue) | SvelteKit + PG + BullMQ + Redis   | —                            | Multi-user, worker-based sync.                                           |
| **The Pithy Reader** (jackc/tpr)   | Go backend + SvelteKit frontend   | Go-based                     | Different stack but same frontend pattern.                               |

## Key Takeaways

- **rss-parser** is the default in the ecosystem — most used, most examples.
- **feedsmith** is the most compelling modern alternative: TypeScript-native,
  faster, more format support, tree-shakable.
- Real-world feeds are often malformed — leniency matters. feedparser and
  @rowanmanning/feed-parser excel here.
- For full-text extraction (getting article body when feed only has summary),
  common approaches:
  - **@mozilla/readability** — Mozilla's readability algorithm (used by Firefox
    reader mode)
  - **Defuddle** — modern alternative, lighter
  - Both require fetching the original article page and parsing HTML body.
- Conditional GET (ETag/Last-Modified) should be implemented at the HTTP layer,
  not in the parser.
