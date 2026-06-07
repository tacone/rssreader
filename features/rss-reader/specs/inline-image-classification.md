# Inline Image Classification

## Motivation

RSS/Atom feed content contains `<img>` tags in two fundamentally different roles:
- **Standalone images**: large content images (hero, body photos, screenshots) that should display as centered blocks with rounded corners and padding
- **Inline images**: small decorative/icon/emoji images mixed with text (WordPress smileys, gravatars, social icons, etc.) that should flow inline at text height

Other readers (Miniflux, NetNewsWire) either ignore the distinction (all images left-aligned) or use limited heuristics (NetNewsWire's `.wp-smiley`). We want a more complete heuristic that handles the full range without per-feed customization.

## Classification Order

Checks run in order: **inline first**, then **standalone** on the remaining unclassified images. This naturally handles transparent wrappers — inline-worthy images inside `<a>`, `<span>`, etc. get caught before standalone checks run.

## Transparent wrappers

When evaluating an `<img>`'s container context, transparent inline wrappers (`<a>`, `<span>`, `<b>`, `<i>`, `<em>`, `<strong>`, etc.) are unwrapped — we walk up through them to find the nearest block-level ancestor as the effective parent.

## Rule 1: Inline images (checked first)

An `<img>` is classified as **inline** if:

- It is **not** the sole child of a block-level element, `<tr>`, `<td>`, or `<th>`
- **AND** any of:
  - It has a declared `height` attribute whose parsed numeric value is < 100, **or**
  - Its `src` URL has a query parameter `h` or `height` with parsed numeric value < 100, **or**
  - Its `src` path matches `/\d{1,3}x\d{1,2}/` (e.g., `74x43`), **or**
  - It is inside a `<pre>` element (any depth), **or**
  - It has a CSS class listed in the inline-img-whitelist (`.wp-smiley`, extendable)

Inline images receive the **inline-image class**. At render time the HTML `height` and `width` attributes are stripped and CSS applies `max-height: 1em; vertical-align: middle`.

If an inline image has visible text content adjacent to it on the same line, additional classes are added:

- **preceded-by-text**: the image's outer wrapper has at least one preceding sibling (walking through transparent wrappers) that contains non-whitespace text. Scanning stops at `<br>`.
- **followed-by-text**: same check on following siblings.

## Rule 2: Standalone images (checked second)

An `<img>` not yet classified as inline is **standalone** if:

- It is either:
  - the sole child of its effective parent (after unwrapping transparent wrappers), **or**
  - preceded *and* followed among its siblings only by start tags, end tags, `<br>` elements, or whitespace-only text nodes
- It has no `<table>`, `<tr>`, `<td>`, or `<th>` ancestor

A standalone image receives the **standalone-image class** which applies `display: block`, centering margins, border-radius, background placeholder, padding, and min-height.

If the `<img>` has a `<figure>` ancestor, it should not receive standalone-image — figures already provide their own layout. If excluding at classification time is impractical, handle via CSS (`.feed-content figure .standalone-image { ... }` reset).

## Rule 3: Default (remainder)

Images not classified as either inline or standalone retain their original HTML attributes and CSS. No special styling is applied. This covers cases like `<figure><img><figcaption>...</figcaption></figure>` where the `<figure>` container is responsible for layout, or consecutive sibling images.

## Implementation

Image classification runs at **sanitize time** (server-side, in the jsdom DOM walk before DOMPurify), alongside existing preprocessing like YouTube embed markers. Classes are stored in the sanitized HTML in the database.

*Note: The current header-image handling can be removed — the heuristic above should cover it.*

## Known Unhandled Cases

- **Consecutive images** (`<img><img>` in same container): Could be a gallery or a list of social icons. Not reliably distinguishable. Rendered as default.
- **Images separated by `<br>`** (`<img><br><img>`): Treated as default, not standalone. Could be reactions, decorative spacing, or intent. Not distinguishable.
- **Data URI images without declared height** (`<img src="data:image/svg+xml,...">`): No height attribute and no URL-based size hints, so no inline trigger fires. They fall through to standalone or default depending on context. Acceptable — intrinsic size is correct for most inline SVGs.
- **Images inside `<figcaption>`**: May appear as inline images within figure captions. These are small by nature and would typically have declared height or be inside a caption context. Left to default behavior.
