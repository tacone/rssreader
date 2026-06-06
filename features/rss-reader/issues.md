## Misc

- #1 - feed item CSS: content styling for article body (typography, spacing, images, code blocks)
- #2 - hosted fonts: choose and integrate a typeface (self-hosted vs Google Fonts vs variable font)
- #3 - design system refinement: consistent spacing, color tokens, component API, dark mode polish
- #4 - add Vercel's portless (or evaluate): zero-config local HTTPS / port forwarding for dev
- #5 - investigate full-circle development: end-to-end dev workflow from spec to deploy
- #6 - fix: dark/light mode icon gets out of sync (use localstorage svelte store)
- #7 - #important investigate why every request is performing `Query: select "id", "public_key", "private_key", "created_at", "expires_at" from "jwks" limit $1 -- params: [100]` even if the auth is supposed to sessionless.
- #8 - #important investigate feed item sandboxing (should be in a iframe or something similar) and html sanitization (investigate existing software)
