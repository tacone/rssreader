---
name: Project Specifics
description: Overview of the RssReader project — tech stack, environments, and development philosophy
priority: CRITICAL
category: knowledge
tags: [rssreader, project, overview, stack, environments]
---

# RssReader Project

**RssReader** is a full-stack TypeScript/JavaScript application with these core components:

- **Backend**: Node.js with tRPC, Polka, PostgreSQL, and Drizzle ORM, Bun
- **Frontend**: Svelte 5 + SvelteKit with Javascript + JSDoc for type safety, Bun
- **Infrastructure**: Docker containers behind nginx in production
- **Database**: PostgreSQL with schema-first approach using Drizzle

## Development Philosophy

Coding and architectural standards are geared around **speed and simplicity** — inefficiencies compound more than usually expected.

- The minimal possible code to implement new features
- The faster is the app, the faster development is
- Abstractions are geared around speed and ease of use, rather than flexibility
- The goal when creating a new page is to be able to do it in a few lines of code
- Smart defaults, centralized error handling, and sensible abstractions all contribute to this goal

## Project Configuration

- **Language**: TypeScript
- **Package Manager**: bun
- **Add-ons**: prettier, eslint, vitest, playwright, tailwindcss, drizzle, better-auth

## Architecture Philosophy

### Core Pillars

1. **Minimalism**: Lightweight dependencies, avoid over-engineering
2. **Developer Experience**: Fast dev cycles, hot reloading, instant feedback
3. **Type Safety**: End-to-end types
4. **Speed**: Optimized for both development and production performance

### Key Design Decisions

- Database-first approach with Drizzle migrations

## Starting Development

See `package.json`

## Dependency Management

We use `bun` for both backend and frontend.
