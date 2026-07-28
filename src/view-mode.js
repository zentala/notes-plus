/**
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Persistence for the notes list/grid view mode.
 *
 * The choice lives in localStorage (per-browser, no backend/sync). Every access
 * is guarded so a throwing localStorage (private mode, storage disabled) falls
 * back to the in-memory default instead of breaking app boot.
 */

export const VIEW_MODE_LIST = 'list'
export const VIEW_MODE_GRID = 'grid'

const STORAGE_KEY = 'notesplus:viewMode'
const DEFAULT_VIEW_MODE = VIEW_MODE_LIST
const VALID_MODES = [VIEW_MODE_LIST, VIEW_MODE_GRID]

/**
 * Read the persisted view mode, or the default when absent/invalid/unavailable.
 *
 * @return {string} 'list' or 'grid'
 */
export function loadViewMode() {
	try {
		const stored = window.localStorage.getItem(STORAGE_KEY)
		return VALID_MODES.includes(stored) ? stored : DEFAULT_VIEW_MODE
	} catch {
		return DEFAULT_VIEW_MODE
	}
}

/**
 * Persist the view mode. Invalid values are ignored; storage errors are swallowed.
 *
 * @param {string} mode 'list' or 'grid'
 * @return {string} the mode that was applied (unchanged input when valid)
 */
export function saveViewMode(mode) {
	if (!VALID_MODES.includes(mode)) {
		return DEFAULT_VIEW_MODE
	}
	try {
		window.localStorage.setItem(STORAGE_KEY, mode)
	} catch {
		// storage unavailable — keep the value in memory only
	}
	return mode
}
