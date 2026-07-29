/**
 * SPDX-FileCopyrightText: 2026 Paweł Żentała and Notes+ contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNotesStore } from './notes.js'

function seed(store) {
	store.notes = [
		{ id: 1, title: 'a', category: '', modified: 3, favorite: false, archived: false, tags: ['Work', 'ideas'] },
		{ id: 2, title: 'b', category: '', modified: 2, favorite: false, archived: false, tags: ['work'] },
		{ id: 3, title: 'c', category: '', modified: 1, favorite: false, archived: false, tags: [] },
		{ id: 4, title: 'd', category: '', modified: 4, favorite: false, archived: true, tags: ['work'] },
	]
}

describe('notes store — tags (E05)', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
	})

	it('counts tags across non-archived notes, de-duped case-insensitively', () => {
		const store = useNotesStore()
		seed(store)
		const tags = store.getTagsWithCounts()
		const work = tags.find((t) => t.name.toLowerCase() === 'work')
		const ideas = tags.find((t) => t.name.toLowerCase() === 'ideas')
		// note 4 is archived, so 'work' counts only notes 1 and 2
		expect(work.count).toBe(2)
		expect(work.name).toBe('Work') // first-seen display casing
		expect(ideas.count).toBe(1)
	})

	it('includes palette-only tags with count 0 and resolves colours', () => {
		const store = useNotesStore()
		seed(store)
		store.setTagColors({ Work: '#f28b82', unused: '#fbbc04' })
		const tags = store.getTagsWithCounts()
		expect(store.getTagColor('work')).toBe('#f28b82') // case-insensitive lookup
		const unused = tags.find((t) => t.name === 'unused')
		expect(unused.count).toBe(0)
		expect(unused.color).toBe('#fbbc04')
	})

	it('filters the list to notes carrying the selected tag (case-insensitive)', () => {
		const store = useNotesStore()
		seed(store)
		store.setSelectedTag('work')
		const ids = store.getFilteredNotes().map((n) => n.id)
		// archived note 4 stays hidden; 1 and 2 carry work
		expect(ids).toEqual([1, 2])
	})

	it('selecting a tag clears the category filter and archived view', () => {
		const store = useNotesStore()
		store.setSelectedCategory('foo')
		store.setShowArchived(true)
		store.setSelectedTag('work')
		expect(store.selectedCategory).toBe(null)
		expect(store.showArchived).toBe(false)
	})
})
