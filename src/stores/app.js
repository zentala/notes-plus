/**
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { defineStore } from 'pinia'
import { loadViewMode, saveViewMode } from '../view-mode.js'

export const useAppStore = defineStore('app', {
	state: () => ({
		settings: {},
		isSaving: false,
		isManualSave: false,
		documentTitle: null,
		searchText: '',
		viewMode: loadViewMode(),
	}),

	actions: {
		setViewMode(mode) {
			this.viewMode = saveViewMode(mode)
		},

		setSettings(settings) {
			this.settings = settings
		},

		setNoteMode(mode) {
			this.settings.noteMode = mode
		},

		setSaving(isSaving) {
			this.isSaving = isSaving
		},

		setManualSave(isManualSave) {
			this.isManualSave = isManualSave
		},

		setDocumentTitle(title) {
			this.documentTitle = title
		},

		updateSearchText(searchText) {
			this.searchText = searchText
		},
	},
})
