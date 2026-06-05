# Deployment Research

## Candidates

| Platform | SvelteKit SSR + Bun | Pricing | Notes |
|----------|---------------------|---------|-------|
| **Railway** | Best (102ms — 3× faster than Cloudflare/Vercel) | $5/mo Hobby | Best SvelteKit SSR perf, Bun via Dockerfile |
| Cloudflare Pages | 314ms | Free tier generous | Workers runtime ≠ Node.js, adapter needed |
| Vercel | 367ms | Free tier → expensive at scale | Bun not native |
| Fly.io | Container (full Node.js) | ~$7-15/mo | Global regions, complex pricing |
| Hetzner VPS | Self-managed | ~€4/mo | Full control, you handle ops |

## Key Notes

- Railway + Bun is the fastest SvelteKit SSR path by a wide margin.
- Railway offers managed Postgres as an addon (same network = low latency).
- If deploying on Railway, local dev with SQLite and production with Postgres is possible via Drizzle's abstraction.
- Cloudflare Pages/Workers is cheapest at scale but incompatible with Bun.
