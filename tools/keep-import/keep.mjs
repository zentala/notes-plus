/**
 * SPDX-FileCopyrightText: 2026 Paweł Żentała and Notes+ contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Google Keep (Takeout) → Notes+ mapping. Pure functions only — no I/O, no
 * network — so the mapping is unit-tested without a live server. Forked from
 * zntl-local-servers/scripts/keep-import/keep.mjs (which targeted memos); this
 * version targets the Notes+ REST API and its front-matter fields (color,
 * archived, tags per ADR-006/007/008; pinned → favorite).
 *
 * Keep note shape (fields we use; others ignored):
 *   { title, textContent, listContent: [{text, isChecked}],
 *     labels: [{name}], color, isPinned, isArchived, isTrashed,
 *     attachments: [{filePath, mimetype}],
 *     createdTimestampUsec, userEditedTimestampUsec }
 */

/**
 * Keep colour enum → a Notes+ front-matter hex (Google Keep's own palette).
 * DEFAULT (and anything unknown) → null, i.e. no colour.
 */
const KEEP_COLORS = {
	RED: '#f28b82',
	ORANGE: '#fbbc04',
	YELLOW: '#fff475',
	GREEN: '#ccff90',
	TEAL: '#a7ffeb',
	BLUE: '#cbf0f8',
	CERULEAN: '#aecbfa',
	DARKBLUE: '#aecbfa',
	PURPLE: '#d7aefb',
	PINK: '#fdcfe8',
	BROWN: '#e6c9a8',
	GRAY: '#e8eaed',
	GREY: '#e8eaed',
}

export function keepColorToHex(color) {
	if (!color) {
		return null
	}
	return KEEP_COLORS[String(color).toUpperCase()] ?? null
}

/** Render Keep list items as a flat markdown checklist. */
function renderChecklist(listContent) {
	return listContent
		.map((item) => `- [${item.isChecked ? 'x' : ' '}] ${item.text ?? ''}`)
		.join('\n')
}

/**
 * Stable identity for dedup across re-runs. Keep JSON has no note id, so we key
 * on created-timestamp + title (unique in practice for one export).
 */
export function noteKey(note) {
	const ts = note.createdTimestampUsec ?? note.userEditedTimestampUsec ?? 0
	return `${ts}:${(note.title ?? '').trim()}`
}

/** Keep usec epoch → unix seconds (Notes+ `modified`), or 0 if unknown. */
export function keepTsToSeconds(usec) {
	if (!usec || Number.isNaN(Number(usec))) {
		return 0
	}
	return Math.round(Number(usec) / 1_000_000)
}

/** Trim, drop empty, de-dupe case-insensitively keeping first-seen casing. */
function normalizeTags(labels) {
	const result = []
	const seen = new Set()
	for (const label of labels ?? []) {
		const name = String(label?.name ?? '').trim()
		if (!name) {
			continue
		}
		const key = name.toLowerCase()
		if (seen.has(key)) {
			continue
		}
		seen.add(key)
		result.push(name)
	}
	return result
}

/**
 * Map one Keep note to a Notes+ import record. Trashed notes (and archived ones
 * when not explicitly included) return `{ skip: <reason> }`.
 *
 * @param {object} note the parsed Keep JSON note
 * @param {{includeArchived?: boolean}} [opts]
 * @return {object} `{ skip }` or a full record
 *   `{ sourceId, title, content, category, favorite, color, archived, tags,
 *      modified, hasAttachments, lossyFlattened }`
 */
export function mapKeepNote(note, opts = {}) {
	if (note.isTrashed) {
		return { skip: 'trashed' }
	}
	if (note.isArchived && !opts.includeArchived) {
		return { skip: 'archived' }
	}

	const isList = Array.isArray(note.listContent) && note.listContent.length > 0
	const body = isList
		? renderChecklist(note.listContent)
		: (note.textContent ?? '').trim()

	return {
		sourceId: noteKey(note),
		title: (note.title ?? '').trim(),
		content: body,
		category: '',
		favorite: Boolean(note.isPinned),
		color: keepColorToHex(note.color),
		archived: Boolean(note.isArchived),
		tags: normalizeTags(note.labels),
		modified: keepTsToSeconds(note.userEditedTimestampUsec ?? note.createdTimestampUsec),
		hasAttachments: Array.isArray(note.attachments) && note.attachments.length > 0,
		// Keep Takeout list items are flat; a rendered checklist loses nothing but
		// this flags list-derived notes for the "flattened" report line.
		lossyFlattened: isList,
	}
}

/**
 * Build the note content to POST, embedding the Keep source id in a front-matter
 * fence so dedup survives even if the local state file is lost. Notes+ strips the
 * fence from the editor body but preserves the `source_id` key on save.
 */
export function contentWithSourceId(record) {
	return `---\nsource_id: ${record.sourceId}\n---\n${record.content}`
}
