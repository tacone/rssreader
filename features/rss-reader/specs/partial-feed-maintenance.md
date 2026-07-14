# Partial Feed Maintenance — Refresh, Recompute & Content Preservation

## Overview

Partial feeds (summary-only) require two operations after the initial fetch:
refresh (re-fetch feed XML + optionally re-fetch article pages) and recompute
(re-apply sanitization pipeline from stored raw fields + optionally re-extract
from stored page HTML).

## Refresh Lifecycle

```
fetchFeed(url) → detectPartialFeed(url, items) → upsertFeed(db, userId, url, result, isPartial)
                                                      │
                                          ┌───────────┴───────────┐
                                          │                       │
                                   INSERT items            onConflictDoUpdate
                                   (new items)             (existing items)
                                          │                       │
                                          │                buildItemUpdateSet
                                          │                  excludes 'content'
                                          │                  when isPartialFeed=1
                                          │                       │
                                          └───────────┬───────────┘
                                                      │
                                          if isPartialFeed:
                                          fetchPageContent(db, feedId, newItems)
                                                      │
                                              fetch each item.url
                                              Readability.parse()
                                              sanitizeHtml()
                                              UPDATE raw_page_content + content
```

### Key guarantee

When a partial feed is refreshed, existing items' `content` is **never**
overwritten by the feed's summary. `buildItemUpdateSet` excludes `content`
from the `onConflictDoUpdate.set` when `isPartialFeed=1`. Only new items
receive the feed summary as a temporary placeholder, which is immediately
replaced by `fetchPageContent` (Readability extraction).

### Detection timing

Detection (`detectPartialFeed`) runs **before** `upsertFeed`, and the
detection result is passed as the `isPartialFeed` flag. This avoids the
chicken-and-egg problem where `upsertFeed` queried `is_partial_feed` from
the DB before detection had a chance to set it.

## Recompute Lifecycle

```
recomputeSingleFeed(db, feed, log?)
         │
  SELECT items (rawTitle, rawSummary, rawContent, rawPageContent)
         │
  for each item:
         │
    if isPartialFeed AND rawPageContent exists:
      extractFromPage(rawPageContent, feed.url)      ← re-extract from stored HTML
      sanitizeHtml(extracted, feed.url)
         │
    else if rawContent:
      sanitizeHtml(rawContent, feed.url)              ← normal recompute from feed content
         │
    UPDATE items SET title, summary, content
```

Re-extracting from `raw_page_content` (stored page HTML) recovers full
article content that was previously destroyed by the `onConflictDoUpdate`
bug, without re-fetching the remote URL.

## Shared Logic

Both refresh and recompute have single-feed and all-feeds variants sharing
a common function:

| Operation | Single feed | All feeds | Shared function |
|---|---|---|---|
| Refresh | `feeds:refresh` | `feeds:refresh-all` | `refreshSingleFeed()` |
| Recompute | `feeds:recompute` | `feeds:recompute-all` | `recomputeSingleFeed()` |

All shared functions live in `src/lib/server/feed/store.ts`.

## CLI Reference

```
# Refresh a single feed (with optional force-re-fetch + detection)
npm run feeds:refresh [--force] <email> <feed-url>

# Refresh all feeds for a user
npm run feeds:refresh-all [--force] <email>

# Recompute a single feed (re-apply sanitization from raw fields)
npm run feeds:recompute <email> <feed-url>

# Recompute all feeds for a user
npm run feeds:recompute-all <email>

# (Re-)detect partial feeds for all feeds of a user
npm run feeds:detect-partial <email>
```

## Test Coverage

- `store.test.ts` — 5 tests for `buildItemUpdateSet` (content excluded
  for partial feeds, included for full feeds, all other fields preserved)
- `detect-partial.test.ts` — 31 tests for detection heuristic
- `extract.test.ts` — 24 tests for Readability extraction pipeline
