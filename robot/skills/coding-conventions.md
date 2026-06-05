---
name: Coding Conventions
description: Project-wide coding conventions for the RssReader project
priority: CRITICAL
category: operative
tags: [rules, conventions, naming, scripts, database]
---

# Coding Conventions

## Database

- Table **names are plural**: `feeds`, `items`, `folders`, `feed_folders`, `item_tags`

## package.json Scripts

- Script names are **colon-namespaced**: `db:push`, `auth:schema`, `feeds:fetch`
