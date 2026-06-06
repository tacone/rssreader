# RSS Reader

A fast, minimal RSS reader built as a pet project. Linear feed UI inspired by Google Reader's linearity — no algorithm, no sharing, just your feeds.

Built from scratch to be tiny, fast, and pleasant to use daily.

## Tech Stack

| Layer            | Choice                                                |
| ---------------- | ----------------------------------------------------- |
| **Runtime**      | Bun                                                   |
| **Framework**    | SvelteKit (SSR)                                       |
| **Database**     | PostgreSQL (Neon in production, local Docker for dev) |
| **ORM**          | Drizzle                                               |
| **Auth**         | Better Auth (email/password, sessionless JWT)         |
| **UI**           | Tailwind CSS v4 + DaisyUI v5                          |
| **Feed parsing** | Feedsmith (RSS 2.0, Atom 1.0, RDF, JSON Feed)         |
| **Tests**        | Vitest (unit) + Playwright (e2e)                      |
| **Deployment**   | Cloudflare Pages                                      |

## Getting Started

### Prerequisites

- **Bun** (runtime)
- **Docker** (local PostgreSQL)

### Setup

```sh
# Start PostgreSQL
docker run -d --name postgres18 -p 5432:5432 -e POSTGRES_HOST_AUTH_METHOD=trust postgres:18

# Create the database
docker exec postgres18 createdb -U postgres rssreader

# Install dependencies
bun install

# Set up environment
cp .env.example .env

# Push the schema to the database
script -q -c "bun run db:push" /dev/null <<< "y"

# Create a test user
bun run seeds:create

# Start the dev server
bun run dev
```

Open [localhost:5173](http://localhost:5173) and log in with `admin@test.com` / `admin123`.

### Adding and Refreshing Feeds

Add feeds from the management page (`/dashboard`) or via CLI:

```sh
bun run feeds:fetch https://example.com/feed.xml
bun run feeds:refresh-all <email>        # Refresh all feeds for a user
bun run feeds:refresh-all --force <email> # Ignore etag/lastModified
```

### Scripts

| Script                 | Purpose                   |
| ---------------------- | ------------------------- |
| `bun run dev`          | Start dev server          |
| `bun run build`        | Production build          |
| `bun run test:unit`    | Unit tests (Vitest)       |
| `bun run test:e2e`     | E2E tests (Playwright)    |
| `bun run db:push`      | Push Drizzle schema to DB |
| `bun run feeds:fetch`  | Fetch and store a feed    |
| `bun run seeds:create` | Create test user          |
