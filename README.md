<!--
  - SPDX-FileCopyrightText: 2016-2024 Nextcloud GmbH and Nextcloud contributors
  - SPDX-FileCopyrightText: 2025 Paweł Żentała and Notes+ contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->
# Notes+

**A community fork of [Nextcloud Notes](https://github.com/nextcloud/notes) that ships the
features the official app has declined for years — while keeping your notes as plain,
sync-safe Markdown files.**

Nextcloud Notes is deliberately minimal: its maintainers have kept it to a single
folder-based category and a distraction-free UI, and have long declined
[tags (#299)](https://github.com/nextcloud/notes/issues/299),
[note colors (#10)](https://github.com/nextcloud/notes/issues/10) and
[reminders (#667)](https://github.com/nextcloud/notes/issues/667) to preserve that scope.
Those are exactly the things a Google-Keep-style workflow needs. **Notes+ is the fork that
adds them back** — without giving up the thing that makes Notes good: every note stays a
real `.md` file in your Nextcloud, editable from any client.

## What Notes+ adds on top of Nextcloud Notes
- 🎨 **Per-note colors** — stored in front-matter, so they survive file sync.
- 🏷️ **Colored, multi-tag labels** — front-matter `tags:`, cached to a DB index for fast search.
- 🗂️ **Archive** — a real archived state, distinct from delete/trash.
- 🧱 **Google-Keep-style card grid** — masonry cards next to the classic list.
- ☑️ **First-class checklists** — nested (1 level), bulk uncheck-all / delete-completed / auto-sink.
- 🔗 **URL capture + link preview.**
- 📥 **Google Keep import** — bring your Takeout export in.

## Design principle (why it stays compatible)
Notes+ keeps upstream's **files-as-source-of-truth** model: colors and tags live in the note's
Markdown front-matter (not a database-only store), so your notes remain portable, exportable, and
sync-safe — the exact constraint that made the upstream maintainers cautious. We honor it; we just
build the UI on top. The `.md` files stay readable by stock Nextcloud Notes and any WebDAV client.

## Status
Early — forked from Nextcloud Notes v6.0.1. Not yet on the Nextcloud app store.

## Credits & license
Notes+ is a fork of **[Nextcloud Notes](https://github.com/nextcloud/notes)** by Kristof Hamann,
Bernhard Posselt, Hendrik Leppelsack, Jan-Christoph Borchardt and the Nextcloud community — thanks
for the foundation (file storage, sync, conflict handling, REST API).

Licensed **AGPL-3.0-or-later**, same as upstream. The official mobile apps
([Android](https://github.com/nextcloud/notes-android) / [iOS](https://github.com/nextcloud/notes-ios))
target the upstream `notes` app and do not connect to this fork.
