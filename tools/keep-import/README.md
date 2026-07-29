# Keep → Notes+ importer (E08)

Import a Google Keep [Takeout](https://takeout.google.com/) export into Notes+.
Maps each Keep note to a Notes+ note: title, text/checklist, colour, pinned →
favorite, archived, labels → tags, timestamps. Trashed notes are skipped.

- Mapping is pure and unit-tested: [`keep.mjs`](keep.mjs) / [`keep.test.js`](keep.test.js).
- The REST client and runner: [`notes-client.mjs`](notes-client.mjs) / [`import.mjs`](import.mjs).
- Linked from the epic plan: [`../../.plan/epics/E08-keep-import/PLAN.md`](../../.plan/epics/E08-keep-import/PLAN.md).

## What maps

| Keep | Notes+ |
|---|---|
| `title` | note title |
| `textContent` | note body |
| `listContent` | flat markdown checklist (`- [ ] …`) |
| `color` | front-matter `color:` (Keep palette → hex; DEFAULT → none) |
| `isPinned` | favorite |
| `isArchived` | front-matter `archived:` (skipped unless `--include-archived`) |
| `labels[].name` | front-matter `tags:` |
| `userEditedTimestampUsec` | modified time |
| `isTrashed` | **skipped** |
| `attachments` | **not uploaded** — text only; re-attach images manually |

## Dedup / re-runs

Idempotent. Each imported note's Keep id is stored two ways:
1. a local `.state.json` (`sourceId → note id`), and
2. an embedded front-matter `source_id:` in the note itself (survives a lost state file).

The importer only ever **creates** notes — it never updates, so a note you edit in
Notes+ after import is never clobbered. Re-running skips notes already in the state file.

## Usage

Dry-run first (no writes, prints the plan):

```sh
node import.mjs --takeout ./Takeout/Keep
```

Apply. Secrets come from the environment only — use an **app password**, not your
login password, and inject it via `password-broker` rather than typing it:

```sh
NOTES_URL=https://nextcloud.internal NOTES_USER=<you> NOTES_PASSWORD=<app-password> \
  node import.mjs --takeout ./Takeout/Keep --apply
```

Flags: `--include-archived` (import archived notes too), `--check` (auth/reachability
probe), `--state <path>` (custom state file).

## Requirements

Node 18+ (uses global `fetch`). The Notes+ app must be enabled on the target server.
