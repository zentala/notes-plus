/**
 * SPDX-FileCopyrightText: 2026 Paweł Żentała and Notes+ contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, expect, it } from 'vitest'
import { contentWithSourceId, keepColorToHex, keepTsToSeconds, mapKeepNote, noteKey } from './keep.mjs'

describe('Keep → Notes+ mapping (E08)', () => {
	it('maps a text note with pin, color, labels and timestamp', () => {
		const rec = mapKeepNote({
			title: 'Groceries',
			textContent: 'milk\nbread',
			color: 'RED',
			isPinned: true,
			labels: [{ name: 'shopping' }, { name: 'Home' }],
			createdTimestampUsec: 1000000,
			userEditedTimestampUsec: 2000000,
		})
		expect(rec).toMatchObject({
			title: 'Groceries',
			content: 'milk\nbread',
			favorite: true,
			color: '#f28b82',
			archived: false,
			tags: ['shopping', 'Home'],
			modified: 2,
			lossyFlattened: false,
		})
		expect(rec.sourceId).toBe('1000000:Groceries')
	})

	it('renders list content as a flat checklist and flags it flattened', () => {
		const rec = mapKeepNote({
			title: 'Todo',
			listContent: [
				{ text: 'a', isChecked: false },
				{ text: 'b', isChecked: true },
			],
		})
		expect(rec.content).toBe('- [ ] a\n- [x] b')
		expect(rec.lossyFlattened).toBe(true)
	})

	it('skips trashed notes and archived notes by default', () => {
		expect(mapKeepNote({ title: 't', isTrashed: true })).toEqual({ skip: 'trashed' })
		expect(mapKeepNote({ title: 'a', isArchived: true })).toEqual({ skip: 'archived' })
	})

	it('includes archived notes when asked, marking archived', () => {
		const rec = mapKeepNote({ title: 'a', textContent: 'x', isArchived: true }, { includeArchived: true })
		expect(rec.archived).toBe(true)
		expect(rec.skip).toBeUndefined()
	})

	it('de-duplicates labels case-insensitively, keeps first casing', () => {
		const rec = mapKeepNote({ title: 't', textContent: 'x', labels: [{ name: 'Work' }, { name: 'work' }, { name: ' ' }] })
		expect(rec.tags).toEqual(['Work'])
	})

	it('maps DEFAULT/unknown color to null', () => {
		expect(keepColorToHex('DEFAULT')).toBe(null)
		expect(keepColorToHex(undefined)).toBe(null)
		expect(keepColorToHex('TEAL')).toBe('#a7ffeb')
	})

	it('converts usec to unix seconds', () => {
		expect(keepTsToSeconds(1_500_000)).toBe(2)
		expect(keepTsToSeconds(0)).toBe(0)
	})

	it('embeds the source id in a front-matter fence for portable dedup', () => {
		const rec = { sourceId: '1000000:N', content: 'body' }
		expect(contentWithSourceId(rec)).toBe('---\nsource_id: 1000000:N\n---\nbody')
	})

	it('noteKey is stable from timestamp + title', () => {
		expect(noteKey({ createdTimestampUsec: 5, title: ' x ' })).toBe('5:x')
	})
})
