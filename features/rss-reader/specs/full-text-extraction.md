# Full-Text Extraction for Partial Feeds

## Problem

Many RSS/Atom feeds serve only a summary or the first paragraph. The reader
must click through to the source site to read the full article. We want to
detect these feeds automatically and fetch the full article content using a
readability-style extractor.

## Detection

### When does detection run?

- **Feed add time** — after parsing the initial feed XML, before confirming
  the feed to the user
- **`refresh --force`** — existing feeds can be re-evaluated on forced refresh

### Heuristic (the "5/3 rule")

For the first 5 items in the feed:

1. Fetch the article URL server-side
2. Parse with jsdom + `@mozilla/readability` to extract article text
3. Compare `Readability.parse().textContent.length` against the feed's
   `summary` or `content` text length (whichever is longer)

If for at least 3 of the 5 items the extracted content is **significantly
larger** than the feed content, mark the feed as partial:

```
match if: extracted_len > max(feed_len * 2, feed_len + 500)
```

This catches both short-summary feeds (50 → 5000 chars) and medium-summary
feeds (300 → 4000 chars).

### DB columns

```sql
-- feeds
ALTER TABLE feeds ADD COLUMN is_partial_feed integer NOT NULL DEFAULT 0;

-- items
ALTER TABLE items ADD COLUMN raw_page_content text;
ALTER TABLE items ADD COLUMN raw_page_error integer;  -- nullable, HTTP status code
ALTER TABLE items ADD COLUMN not_renderable integer NOT NULL DEFAULT 0;
```

`is_partial_feed`, `not_renderable` are integer booleans (0/1).

## Pipeline

### At fetch time

When downloading a feed where `is_partial_feed = 1`, for each item:

1. If `raw_page_content` is already set, skip (already fetched)
2. Fetch `item.url` with a standard HTTP GET
3. On success: store the full response HTML in `raw_page_content`, set
   `raw_page_error = null`
4. On HTTP error: set `raw_page_error` to the status code, leave
   `raw_page_content` null
5. On network error (timeout, DNS failure): set `raw_page_error = -1`
   (reserved sentinel for non-HTTP errors), leave `raw_page_content` null
6. Run `isProbablyReaderable()` on the fetched HTML:
   - If `false`: set `not_renderable = 1`
   - If `true`: set `not_renderable = 0`

`raw_page_content` is stored as-is (raw HTML). No sanitization at this stage.

### At transform time

In the existing sanitize/transform step (replaces `content` from feed content
with extracted content):

```
if raw_page_content is not null and not_renderable = 0:
  doc = new JSDOM(raw_page_content, { url: item.url })
  result = new Readability(doc.window.document).parse()
  if result and result.content:
    cleanHtml = result.content
    // run normal sanitize pipeline on cleanHtml:
    //   resolveRelativeUrls → highlightCodeBlocks → embed preprocessing
    //   → image classification → DOMPurify → minify
    store in item.content
  else:
    readability failed silently → fall back to feed content
else:
  // not_renderable = 1 or no raw_page_content
  // keep original feed content as-is
```

The extracted content replaces the feed's original `content` in the `content`
column. `rawContent` preserves the original feed-provided content.

### Query logic in UI

When rendering an item:

```
if content is not null:
  render content (may be feed-provided or readability-extracted)
else:
  show "Open in browser" link
```

No distinction at render time — the `content` column is always the best
available version.

## Library

**`@mozilla/readability`** v0.6.0+

### API

```ts
import { Readability, isProbablyReaderable } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

const doc = new JSDOM(rawHtml, { url: articleUrl });

if (isProbablyReaderable(doc.window.document)) {
  const result = new Readability(doc.window.document).parse();
  // result.content     → cleaned article HTML
  // result.textContent → plain text (for length comparison)
  // result.title       → extracted title
  // result.excerpt     → article excerpt
  // result.byline      → author
  // result.publishedTime → ISO date string
}
```

### Why this library

- Already compatible with our existing jsdom dependency
- Most battle-tested extractor (Firefox reader mode, 15+ years, 11K stars)
- 0.94 F1 score — highest among JS extractors per 2026 benchmark
- 14 ms/page warm, ~90 KB — negligible overhead
- `isProbablyReaderable()` guard avoids wasting time on non-article pages

## Edge cases

### Paywalled articles

Readability extracts whatever is in the initial HTML. If a page serves only
a preview to anonymous fetchers, the extraction will be short. We don't
replace the content in this case (extracted length < feed content length).
`raw_page_content` remains in the DB for potential future re-extraction.

### JavaScript-rendered pages

jsdom does not run JS. For SPAs that render content client-side,
`isProbablyReaderable()` usually returns `false`, so `not_renderable = 1`
and we fall back to the original feed content.

### Non-article pages

Some feed items link to category pages, search results, or media files.
`isProbablyReaderable()` handles most of these. When false, `not_renderable`
is set and original feed content is shown.

### Feeds that improve later

Re-running `refresh --force` re-evaluates items whose `raw_page_content` is
null or errored. Items that already have `raw_page_content` are preserved.

## CLI

### `feeds:detect-partial <email>`

Runs the 5/3 heuristic on all feeds. For each feed, fetches the first 5 items'
URLs, runs Readability, compares lengths, sets `is_partial_feed = 1` or `0`.
Does **not** store `raw_page_content` — this is detection only.

### `feeds:refresh-all <email> --force`

Existing command. For feeds with `is_partial_feed = 1`, also fetches
`raw_page_content` for items that don't have it yet (or re-fetches on error).
No separate `feeds:re-extract` needed.

## DB migration

```sql
ALTER TABLE feeds ADD COLUMN is_partial_feed integer NOT NULL DEFAULT 0;
ALTER TABLE items ADD COLUMN raw_page_content text;
ALTER TABLE items ADD COLUMN raw_page_error integer;
ALTER TABLE items ADD COLUMN not_renderable integer NOT NULL DEFAULT 0;
```

Down:
```sql
ALTER TABLE feeds DROP COLUMN is_partial_feed;
ALTER TABLE items DROP COLUMN raw_page_content;
ALTER TABLE items DROP COLUMN raw_page_error;
ALTER TABLE items DROP COLUMN not_renderable;
```

## Future considerations

- Manual per-feed toggle to always fetch full content
- Custom CSS selectors per feed (for sites Readability struggles with)
- Background queue for batch re-extraction
- Storage of extracted metadata (byline, publishedTime) in item columns
