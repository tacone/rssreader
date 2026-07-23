# Folder Tree with Kebab Menus — Implementation Plan

## Context

- **Flat folders** (no nesting), one folder per feed
- Sidebar: 240px `<aside>` with `overflow-y-auto`
- Virtual nodes: "All Items" and "Starred" at top
- Create folder button (`[+]`) next to "My Folders" header
- Kebab menu (`[⋮]`) on folder rows (Rename, Delete, Move up, Move down)
- Kebab menu (`[⋮]`) on feed rows (Move to folder...)
- Feed-to-folder assignment via small modal listing folders

## Database

- `folders` table — add `sortOrder` column
- `feed_folders` table — add unique constraint on `feed_id` (one folder per feed)

## Sidebar Component Hierarchy

```
aside.sidebar
  ├── Add Feed form (existing)
  ├── Virtual nodes: All Items, Starred
  ├── "My Folders" header + [+] create button
  ├── Folder rows (repeated)
  │   ├── <details.collapse.collapse-arrow>
  │   │   ├── <summary> draggable
  │   │   │   ├── collapse caret
  │   │   │   ├── folder name
  │   │   │   ├── unread badge
  │   │   │   └── [⋮] kebab button
  │   │   └── Feed rows
  │   │       ├── feed link + icon + unread
  │   │       └── [⋮] kebab → "Move to folder..."
  │   └── </details>
  └── Uncategorized section (virtual)
      └── feed rows
```

## Kebab Portal

Fixed-position `<div>` at layout root, outside sidebar. Coordinates from `getBoundingClientRect()`. Transparent backdrop to close.

## Drag-and-drop

Native HTML5 DnD on `<summary>` elements. Programmatic POST to `?/reorderFolders`.

## Expand/Collapse

`<details>` element. State persisted in localStorage with Zod validation (`z.record(z.string(), z.boolean())`).

## Server Actions

| Action | Inputs | Behavior |
|---|---|---|
| `createFolder` | `name` | Insert with sortOrder = max + 1 |
| `renameFolder` | `folderId, name` | Update name |
| `deleteFolder` | `folderId` | Delete (CASCADE removes feed_folders) |
| `moveFolder` | `folderId, direction` | Swap sortOrder with neighbor |
| `reorderFolders` | `folderIds[]` | Assign sequential sortOrder |
| `assignFeedToFolder` | `feedId, folderId` | Upsert feed_folders |

## Implementation Order

1. Schema: add sortOrder + unique on feed_id → db:push
2. Folder state store (localStorage + Zod)
3. Layout server: return folders with grouped feeds
4. Server actions (all 6)
5. Sidebar: virtual nodes, my folders header, create modal
6. Folder rows: collapse, kebab, drag-and-drop
7. Feed rows: feed kebab + move-to-folder modal
8. Uncategorized section with collapse
9. Verify build + tests
