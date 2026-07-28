/**
 * SPDX-FileCopyrightText: 2026 Paweł Żentała and Notes+ contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { translate as t } from '@nextcloud/l10n'

/**
 * Google-Keep-style palette. The hex value is the source of truth stored in the
 * note's front-matter (ADR-007); `id` is only a stable handle for the UI. The
 * `null` value clears the color (no front-matter attr).
 *
 * @type {{ id: string, value: string|null, label: string }[]}
 */
export const noteColors = [
	{ id: 'none', value: null, label: t('notesplus', 'No color') },
	{ id: 'red', value: '#f28b82', label: t('notesplus', 'Red') },
	{ id: 'orange', value: '#fbbc04', label: t('notesplus', 'Orange') },
	{ id: 'yellow', value: '#fff475', label: t('notesplus', 'Yellow') },
	{ id: 'green', value: '#ccff90', label: t('notesplus', 'Green') },
	{ id: 'teal', value: '#a7ffeb', label: t('notesplus', 'Teal') },
	{ id: 'blue', value: '#cbf0f8', label: t('notesplus', 'Blue') },
	{ id: 'darkblue', value: '#aecbfa', label: t('notesplus', 'Dark blue') },
	{ id: 'purple', value: '#d7aefb', label: t('notesplus', 'Purple') },
	{ id: 'pink', value: '#fdcfe8', label: t('notesplus', 'Pink') },
	{ id: 'brown', value: '#e6c9a8', label: t('notesplus', 'Brown') },
	{ id: 'gray', value: '#e8eaed', label: t('notesplus', 'Gray') },
]

/**
 * Normalize a stored color to a known swatch value, or null if unset/unknown.
 * Unknown-but-non-empty values (e.g. from a hand-edited file) are kept as-is so
 * we never silently drop a user's color.
 *
 * @param {string|null|undefined} color the stored color
 * @return {string|null}
 */
export function normalizeColor(color) {
	if (!color) {
		return null
	}
	return color.toLowerCase()
}
