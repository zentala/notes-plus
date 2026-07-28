/**
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Grouping for the card-grid (Keep-style) view.
 *
 * Unlike the list view's timeslot buckets (Today/Yesterday/…), the grid uses
 * Keep's two sections — Pinned (favorites) above Others — when no category is
 * selected, and per-category groups otherwise. Input is expected to be the
 * already-filtered, already-sorted list from `getFilteredNotes` (favorites are
 * sorted to the front in no-category mode), so this only partitions; it never
 * drops a note.
 *
 * @param {object[]} notes            filtered + sorted notes
 * @param {?string}  selectedCategory the active category, or null for "all notes"
 * @return {{ key: string, label: ?string, notes: object[] }[]} non-empty groups, in order
 */
export function groupNotesForGrid(notes, selectedCategory) {
	if (selectedCategory === null) {
		const pinned = []
		const others = []
		for (const note of notes) {
			(note.favorite ? pinned : others).push(note)
		}
		const groups = []
		if (pinned.length > 0) {
			groups.push({ key: 'pinned', label: t('notesplus', 'Pinned'), notes: pinned })
		}
		if (others.length > 0) {
			// no caption for Others when there is nothing pinned above it
			const label = pinned.length > 0 ? t('notesplus', 'Others') : null
			groups.push({ key: 'others', label, notes: others })
		}
		return groups
	}

	// category selected: one group per distinct category, preserving order
	const groups = []
	for (const note of notes) {
		const last = groups[groups.length - 1]
		if (!last || last.key !== note.category) {
			groups.push({ key: note.category, label: note.category, notes: [] })
		}
		groups[groups.length - 1].notes.push(note)
	}
	return groups
}
