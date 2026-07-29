/**
 * SPDX-FileCopyrightText: 2026 Paweł Żentała and Notes+ contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, expect, it } from 'vitest'
import {
	deleteCompleted,
	hasChecklist,
	parseChecklist,
	setCheckedAt,
	sinkChecked,
	toggleAt,
	uncheckAll,
} from './checklist.js'

describe('checklist model (E06)', () => {
	it('parses items with indent and checked state, in render order', () => {
		const text = '# Todo\n- [ ] a\n- [x] b\n  - [ ] b1\n'
		const items = parseChecklist(text)
		expect(items.map((i) => [i.line, i.indent, i.checked, i.text])).toEqual([
			[1, 0, false, 'a'],
			[2, 0, true, 'b'],
			[3, 2, false, 'b1'],
		])
	})

	it('skips `- [ ]` inside fenced code blocks', () => {
		const text = '- [ ] real\n```\n- [ ] not a task\n```\n- [x] also real\n'
		const items = parseChecklist(text)
		expect(items.map((i) => i.line)).toEqual([0, 4])
	})

	it('toggles by ordinal without being fooled by a code fence (the old bug)', () => {
		const text = '- [ ] real\n```\n- [ ] fake\n```\n- [ ] second\n'
		// ordinal 1 is the SECOND real checkbox (source line 4), not the fenced one
		const out = setCheckedAt(text, 1, true)
		expect(out).toBe('- [ ] real\n```\n- [ ] fake\n```\n- [x] second\n')
	})

	it('toggleAt flips the current state', () => {
		expect(toggleAt('- [ ] a\n- [x] b\n', 1)).toBe('- [ ] a\n- [ ] b\n')
		expect(toggleAt('- [ ] a\n- [x] b\n', 0)).toBe('- [x] a\n- [x] b\n')
	})

	it('uncheckAll clears every box but preserves prose and structure', () => {
		const text = '# T\n- [x] a\n- [ ] b\nplain line\n- [X] c\n'
		expect(uncheckAll(text)).toBe('# T\n- [ ] a\n- [ ] b\nplain line\n- [ ] c\n')
	})

	it('deleteCompleted removes checked items and a checked parent\'s subtree', () => {
		const text = '- [x] parent\n  - [ ] child\n- [ ] keep\n- [x] done\n'
		// checked parent takes its child; standalone checked 'done' removed; 'keep' stays
		expect(deleteCompleted(text)).toBe('- [ ] keep\n')
	})

	it('deleteCompleted removes a checked child under an unchecked parent, no cascade', () => {
		const text = '- [ ] parent\n  - [x] child\n  - [ ] child2\n'
		expect(deleteCompleted(text)).toBe('- [ ] parent\n  - [ ] child2\n')
	})

	it('sinkChecked moves checked top-level items with their subtree to the bottom, stable', () => {
		const text = '- [x] done1\n  - [ ] sub\n- [ ] todo1\n- [x] done2\n- [ ] todo2\n'
		expect(sinkChecked(text)).toBe('- [ ] todo1\n- [ ] todo2\n- [x] done1\n  - [ ] sub\n- [x] done2\n')
	})

	it('sinkChecked does not move a checked child under an unchecked parent', () => {
		const text = '- [ ] parent\n  - [x] child\n- [ ] other\n'
		expect(sinkChecked(text)).toBe(text)
	})

	it('hasChecklist reflects presence of task items', () => {
		expect(hasChecklist('just text\n')).toBe(false)
		expect(hasChecklist('- [ ] a\n')).toBe(true)
	})
})
