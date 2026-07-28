/**
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, expect, it } from 'vitest'
import { groupNotesForGrid } from './grouping.js'

function note(id, { favorite = false, category = '' } = {}) {
	return { id, favorite, category }
}

function total(groups) {
	return groups.reduce((n, g) => n + g.notes.length, 0)
}

describe('groupNotesForGrid — no category (Pinned/Others)', () => {
	it('splits favorites into Pinned and the rest into Others, losing none', () => {
		const notes = [note(1, { favorite: true }), note(2, { favorite: true }), note(3), note(4)]
		const groups = groupNotesForGrid(notes, null)

		expect(groups.map((g) => g.key)).toEqual(['pinned', 'others'])
		expect(groups[0].notes.map((n) => n.id)).toEqual([1, 2])
		expect(groups[1].notes.map((n) => n.id)).toEqual([3, 4])
		expect(total(groups)).toBe(notes.length)
	})

	it('shows no Pinned group and no Others caption when nothing is favorite', () => {
		const groups = groupNotesForGrid([note(1), note(2)], null)
		expect(groups).toHaveLength(1)
		expect(groups[0].key).toBe('others')
		expect(groups[0].label).toBeNull()
	})

	it('shows only the Pinned group when everything is favorite', () => {
		const groups = groupNotesForGrid([note(1, { favorite: true })], null)
		expect(groups).toHaveLength(1)
		expect(groups[0].key).toBe('pinned')
	})

	it('returns nothing for an empty list', () => {
		expect(groupNotesForGrid([], null)).toEqual([])
	})
})

describe('groupNotesForGrid — category selected', () => {
	it('groups consecutive notes by category, losing none', () => {
		const notes = [
			note(1, { category: 'work' }),
			note(2, { category: 'work' }),
			note(3, { category: 'home' }),
		]
		const groups = groupNotesForGrid(notes, 'work')

		expect(groups.map((g) => g.key)).toEqual(['work', 'home'])
		expect(total(groups)).toBe(notes.length)
	})
})
