/**
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadViewMode, saveViewMode, VIEW_MODE_GRID, VIEW_MODE_LIST } from './view-mode.js'

const KEY = 'notesplus:viewMode'

afterEach(() => {
	window.localStorage.clear()
	vi.restoreAllMocks()
})

describe('view-mode persistence', () => {
	it('defaults to list when nothing is stored', () => {
		expect(loadViewMode()).toBe(VIEW_MODE_LIST)
	})

	it('round-trips through localStorage', () => {
		expect(saveViewMode(VIEW_MODE_GRID)).toBe(VIEW_MODE_GRID)
		expect(window.localStorage.getItem(KEY)).toBe(VIEW_MODE_GRID)
		expect(loadViewMode()).toBe(VIEW_MODE_GRID)
	})

	it('ignores an invalid stored value', () => {
		window.localStorage.setItem(KEY, 'nonsense')
		expect(loadViewMode()).toBe(VIEW_MODE_LIST)
	})

	it('ignores an invalid input to saveViewMode without writing', () => {
		expect(saveViewMode('nonsense')).toBe(VIEW_MODE_LIST)
		expect(window.localStorage.getItem(KEY)).toBeNull()
	})

	it('falls back to the default when reading throws', () => {
		vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
			throw new Error('storage disabled')
		})
		expect(loadViewMode()).toBe(VIEW_MODE_LIST)
	})

	it('swallows a write error and still returns the applied mode', () => {
		vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
			throw new Error('storage disabled')
		})
		expect(saveViewMode(VIEW_MODE_GRID)).toBe(VIEW_MODE_GRID)
	})
})
