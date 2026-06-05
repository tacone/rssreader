# Database Research

## Candidates

| Option | Type | Best For | Drawbacks |
|--------|------|----------|-----------|
| **Neon** | PostgreSQL (managed, serverless) | Full power, search, room to grow | Slight ops overhead vs SQLite |
| **Turso** | SQLite via libSQL | Zero-config local dev, edge replicas | No proper full-text search |
| **Cloudflare D1** | SQLite at edge | Cheapest, generous free tier | Only in Workers, no FTS, write limits |
| **Supabase** | PostgreSQL (managed) | Bundled auth + storage | Heavier vendor lock-in |

## Key Notes

- Drizzle supports all of them; switching DBs means changing only the driver import.
- Neon has scale-to-zero (free when idle) and an HTTP driver that works in edge runtimes.
- Turso gives 500 databases on free tier — per-tenant isolation at zero cost.
- D1 max 10GB, ~50 writes/sec — fine for personal use but hits limits.
- For full-text search (needed for the Search feature), PostgreSQL (Neon) is significantly better.
