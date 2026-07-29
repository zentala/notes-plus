/**
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { showError } from '@nextcloud/dialogs'
import { emit, subscribe, unsubscribe } from '@nextcloud/event-bus'
import logger from '../Logger.js'
import { normalizeColor } from '../notes-colors.js'
import { deleteNote, fetchNote, setArchived, setCategory, setColor, setFavorite, setTitle } from '../NotesService.js'
import store from '../store.js'
import { categoryLabel, routeIsNewNote } from '../Util.js'

/**
 * Shared note-tile behaviour for NoteItem (list row) and NoteCard (grid tile).
 *
 * The action buttons themselves must stay inline in each component's template:
 * NcActions / NcListItem inspect their direct slot children to build the menu,
 * so wrapping the buttons in a child component (even a vue-frag Fragment) hides
 * them and the menu renders empty. Only the logic is shared here; the markup is
 * duplicated on purpose.
 */
export default {
	props: {
		note: {
			type: Object,
			required: true,
		},
	},

	data() {
		return {
			loading: {
				note: false,
				category: false,
				favorite: false,
				color: false,
				delete: false,
			},
			newTitle: '',
			renaming: false,
			showCategorySelect: false,
			showColorSelect: false,
			isShareCreated: false,
		}
	},

	computed: {
		isDraggable() {
			return !this.note.readonly
		},

		isSelected() {
			return store.notes.getSelectedNote() === this.note.id
		},

		isShared() {
			return this.note.isShared || this.isShareCreated
		},

		title() {
			return this.note.title + (this.note.unsaved ? ' *' : '')
		},

		colorStyle() {
			const color = normalizeColor(this.note.color)
			return color ? { '--np-note-color': color } : {}
		},

		categoryTitle() {
			return categoryLabel(this.note.category)
		},

		actionFavoriteText() {
			return this.note.favorite ? this.t('notesplus', 'Remove from favorites') : this.t('notesplus', 'Add to favorites')
		},

		actionFavoriteIcon() {
			let icon = this.note.favorite ? 'icon-star-dark' : 'icon-starred'
			if (this.loading.favorite) {
				icon += ' loading'
			}
			return icon
		},

		actionArchivedText() {
			return this.note.archived ? this.t('notesplus', 'Unarchive') : this.t('notesplus', 'Archive')
		},

		actionDeleteIcon() {
			return 'icon-delete' + (this.loading.delete ? ' loading' : '')
		},

		categories() {
			return [
				{
					id: '',
					label: categoryLabel(''),
				},
				...store.notes.getCategories(0, false).map((category) => ({
					id: category,
					label: categoryLabel(category),
				})),
			]
		},
	},

	mounted() {
		subscribe('files_sharing:share:created', this.onShareCreated)
	},

	destroyed() {
		unsubscribe('files_sharing:share:created', this.onShareCreated)
	},

	methods: {
		onDragStart(event) {
			if (!this.isDraggable) {
				event.preventDefault()
				return
			}

			const noteId = this.note.id.toString()
			event.dataTransfer.effectAllowed = 'move'
			try {
				event.dataTransfer.setData('application/x-nextcloud-notes-note-id', noteId)
			} catch {
				// Some browsers only allow specific mime types.
			}
			event.dataTransfer.setData('text/plain', noteId)
		},

		onMenuChange(open) {
			if (!open) {
				this.showCategorySelect = false
				this.showColorSelect = false
			}
		},

		onNoteSelected() {
			this.$emit('note-selected', this.note.id)
		},

		async onColorSelected(color) {
			this.showColorSelect = false
			if ((this.note.color ?? null) === (color ?? null)) {
				return
			}
			this.loading.color = true
			try {
				await setColor(this.note.id, color)
			} finally {
				this.loading.color = false
			}
		},

		onToggleFavorite() {
			this.loading.favorite = true
			setFavorite(this.note.id, !this.note.favorite)
				.catch(() => {
				})
				.then(() => {
					this.loading.favorite = false
				})
		},

		onToggleArchived() {
			setArchived(this.note.id, !this.note.archived)
				.catch(() => {})
		},

		startRenaming() {
			this.renaming = true
			this.newTitle = this.note.title
			this.$emit('start-renaming', this.note.id)
		},

		onInputChange(event) {
			this.newTitle = event.target.value.toString()
		},

		async onCategoryChange(result) {
			this.showCategorySelect = false
			const category = result?.id ?? result?.label ?? null
			if (category !== null && this.note.category !== category) {
				this.loading.category = true
				await setCategory(this.note.id, category)
				this.loading.category = false
			}
		},

		async onRename() {
			const newTitle = this.newTitle.toString()
			if (!newTitle) {
				return
			}
			this.loading.note = true
			setTitle(this.note.id, newTitle)
				.then(() => {
					this.newTitle = ''
				})
				.catch((e) => {
					logger.error('Failed to rename note', { error: e })
					showError(this.t('notesplus', 'Error while renaming note.'))
				})
				.finally(() => {
					this.loading.note = false
				})

			if (routeIsNewNote(this.$route)) {
				this.$router.replace({
					name: 'note',
					params: { noteId: this.note.id.toString() },
				})
			}
			this.renaming = false
		},

		async onDeleteNote() {
			this.loading.delete = true
			try {
				const note = await fetchNote(this.note.id)
				if (note.errorType) {
					throw new Error('Note has errors')
				}
				await deleteNote(this.note.id, () => {
					this.$emit('note-deleted', note)
					this.loading.delete = false
				})
			} catch (e) {
				logger.error('Error during preparing note for deletion', { error: e })
				showError(this.t('notesplus', 'Error during preparing note for deletion.'))
				this.loading.delete = false
			}
		},

		onToggleSharing() {
			emit('notes:share:open', { noteId: this.note.id })
		},

		async onShareCreated(event) {
			const { share } = event

			if (share.fileSource === this.note.id) {
				this.isShareCreated = true
			}
		},
	},
}
