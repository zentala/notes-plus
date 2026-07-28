/**
 * SPDX-FileCopyrightText: 2021 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export const noteAttributes = [
	'id',
	'etag',
	'title',
	'content',
	'modified',
	'favorite',
	'category',
	'color',
	'archived',
]

export function copyNote(from, to, exclude) {
	if (exclude === undefined) {
		exclude = []
	}
	noteAttributes.forEach((attr) => {
		if (!exclude.includes(attr)) {
			to[attr] = from[attr]
		}
	})
	return to
}

export function categoryLabel(category) {
	return category === '' ? t('notesplus', 'Uncategorized') : category.replace(/\//g, ' / ')
}

export function routeIsNewNote($route) {
	return Object.hasOwn($route.query, 'new')
}

export function isNoteDrag(event) {
	const dt = event?.dataTransfer
	if (!dt) {
		return false
	}

	const types = Array.from(dt.types ?? [])
	if (types.includes('application/x-nextcloud-notes-note-id')) {
		return true
	}
	if (types.includes('text/uri-list')) {
		return false
	}
	try {
		return /^\s*\d+\s*$/.test(dt.getData('text/plain'))
	} catch {
		return false
	}
}

export function getDraggedNoteId(event, getNoteById) {
	const dt = event?.dataTransfer
	if (!dt) {
		return null
	}

	const types = Array.from(dt.types ?? [])
	const hasCustom = types.includes('application/x-nextcloud-notes-note-id')
	const hasUri = types.includes('text/uri-list')
	if (!hasCustom && hasUri) {
		return null
	}

	let raw = ''
	if (hasCustom) {
		try {
			raw = dt.getData('application/x-nextcloud-notes-note-id')
		} catch {
			// Some browsers only allow specific mime types.
		}
	}
	if (!raw) {
		try {
			raw = dt.getData('text/plain')
		} catch {
			raw = ''
		}
	}

	const match = /^\s*(\d+)\s*$/.exec(raw)
	const noteId = match ? Number.parseInt(match[1], 10) : Number.NaN
	if (!Number.isFinite(noteId)) {
		return null
	}
	const note = getNoteById ? getNoteById(noteId) : null
	if (!note || note.readonly) {
		return null
	}

	return noteId
}

export function getDefaultSampleNoteTitle() {
	return t('notesplus', 'Sample note')
}

/* eslint-disable @stylistic/indent-binary-ops */
export function getDefaultSampleNote() {
	return '# ' + getDefaultSampleNoteTitle() + `

* 📅 ` + t('notesplus', '15 January 2021, via Nextcloud Notes') + `
* 👥 ` + t('notesplus', 'Me, you, and all our friends!') + `

## ` + t('notesplus', 'Tasks') + ` ✅

* [ ] ` + t('notesplus', 'Write nice todo lists') + `
* [ ] ` + t('notesplus', 'Buy Fries') + `
* [ ] …

## ` + t('notesplus', 'Birthdays') + `

* ` + t('notesplus', 'Jen, in three days!') + `
* ` + t('notesplus', 'Moss, 21.03.1973') + `
* ` + t('notesplus', 'Roy, 1979') + `

## ` + t('notesplus', 'Review Steps') + ` 🔁

1. ` + t('notesplus', 'Turn PC off') + `
2. ` + t('notesplus', 'Turn PC on') + `
3. ` + t('notesplus', 'Then call IT') + `

## ` + t('notesplus', 'Quotes') + ` 💬

> ` + t('notesplus', 'Nextcloud, a safe home for all your data') + `
`
}
/* eslint-enable @stylistic/indent-binary-ops */

export function escapeHtml(str) {
	const element = document.createElement('div')
	element.textContent = str
	return element.innerHTML
}
