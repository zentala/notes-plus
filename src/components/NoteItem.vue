<!--
  - SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
	<NcListItem
		:name="title"
		:active="isSelected"
		:to="{ name: 'note', params: { noteId: note.id.toString() } }"
		:draggable="isDraggable"
		:style="colorStyle"
		:class="{ 'note-item--colored': !!note.color }"
		one-line
		@update:menuOpen="onMenuChange"
		@click="onNoteSelected(note.id)"
		@dragstart.native="onDragStart"
	>
		<template v-if="showCategoryTitle" #subname>
			{{ categoryTitle }}
		</template>
		<template #icon>
			<AlertOctagonOutlineIcon v-if="note.error"
				slot="icon"
				:size="20"
				fill-color="#E9322D"
			/>
			<StarIcon v-else-if="note.favorite"
				slot="icon"
				:size="20"
				fill-color="#FC0"
			/>
		</template>
		<template v-if="isShared" #indicator>
			<ShareVariantOutlineIcon :size="16" fill-color="#0082c9" />
		</template>
		<template #actions>
			<NcActionButton :icon="actionFavoriteIcon" @click="onToggleFavorite">
				{{ actionFavoriteText }}
			</NcActionButton>

			<NcActionButton @click="onToggleArchived">
				<template #icon>
					<ArchiveArrowUpOutlineIcon v-if="note.archived" :size="20" />
					<ArchiveArrowDownOutlineIcon v-else :size="20" />
				</template>
				{{ actionArchivedText }}
			</NcActionButton>

			<NcActionButton @click="onToggleSharing">
				<template #icon>
					<ShareVariantOutlineIcon :size="20" />
				</template>
				{{ t('notesplus', 'Share') }}
			</NcActionButton>

			<NcActionButton v-if="!showColorSelect" :close-after-click="false" @click="showColorSelect = true">
				<template #icon>
					<PaletteOutlineIcon :size="20" />
				</template>
				{{ t('notesplus', 'Change color') }}
			</NcActionButton>
			<template v-else>
				<NcActionButton :close-after-click="false" @click="showColorSelect = false">
					<template #icon>
						<ChevronLeftIcon :size="20" />
					</template>
					{{ t('notesplus', 'Back') }}
				</NcActionButton>
				<NoteColorPicker
					:value="note.color"
					@select="onColorSelected"
				/>
			</template>

			<NcActionButton v-if="!showCategorySelect" @click="showCategorySelect = true">
				<template #icon>
					<FolderOutlineIcon :size="20" />
				</template>
				{{ categoryTitle }}
			</NcActionButton>
			<NcActionInput
				v-else
				:model-value="note.category"
				type="multiselect"
				label="label"
				track-by="id"
				:multiple="false"
				:options="categories"
				:disabled="loading.category"
				:taggable="true"
				@input="onCategoryChange"
				@search-change="onCategoryChange"
			>
				<template #icon>
					<FolderOutlineIcon :size="20" />
				</template>
				{{ t('notesplus', 'Change category') }}
			</NcActionInput>

			<NcActionButton v-if="!renaming" @click="startRenaming">
				<PencilOutlineIcon slot="icon" :size="20" />
				{{ t('notesplus', 'Rename') }}
			</NcActionButton>
			<NcActionInput v-else
				v-model.trim="newTitle"
				:disabled="!renaming"
				:placeholder="t('notesplus', 'Rename note')"
				:show-trailing-button="true"
				@input="onInputChange($event)"
				@submit="onRename"
			>
				<PencilOutlineIcon slot="icon" :size="20" />
			</NcActionInput>

			<NcActionSeparator />

			<NcActionButton v-if="!note.readonly"
				:icon="actionDeleteIcon"
				:close-after-click="true"
				@click="onDeleteNote"
			>
				{{ t('notesplus', 'Delete note') }}
			</NcActionButton>
		</template>
	</NcListItem>
</template>

<script>
import { showError } from '@nextcloud/dialogs'
import { emit, subscribe, unsubscribe } from '@nextcloud/event-bus'
import NcActionButton from '@nextcloud/vue/components/NcActionButton'
import NcActionInput from '@nextcloud/vue/components/NcActionInput'
import NcActionSeparator from '@nextcloud/vue/components/NcActionSeparator'
import NcListItem from '@nextcloud/vue/components/NcListItem'
import AlertOctagonOutlineIcon from 'vue-material-design-icons/AlertOctagonOutline.vue'
import ArchiveArrowDownOutlineIcon from 'vue-material-design-icons/ArchiveArrowDownOutline.vue'
import ArchiveArrowUpOutlineIcon from 'vue-material-design-icons/ArchiveArrowUpOutline.vue'
import ChevronLeftIcon from 'vue-material-design-icons/ChevronLeft.vue'
import FolderOutlineIcon from 'vue-material-design-icons/FolderOutline.vue'
import PaletteOutlineIcon from 'vue-material-design-icons/PaletteOutline.vue'
import PencilOutlineIcon from 'vue-material-design-icons/PencilOutline.vue'
import ShareVariantOutlineIcon from 'vue-material-design-icons/ShareVariantOutline.vue'
import StarIcon from 'vue-material-design-icons/Star.vue'
import NoteColorPicker from './NoteColorPicker.vue'
import logger from '../Logger.js'
import { normalizeColor } from '../notes-colors.js'
import { deleteNote, fetchNote, setArchived, setCategory, setColor, setFavorite, setTitle } from '../NotesService.js'
import store from '../store.js'
import { categoryLabel, routeIsNewNote } from '../Util.js'

export default {
	name: 'NoteItem',

	components: {
		AlertOctagonOutlineIcon,
		ArchiveArrowDownOutlineIcon,
		ArchiveArrowUpOutlineIcon,
		ChevronLeftIcon,
		FolderOutlineIcon,
		NcActionButton,
		NcListItem,
		NoteColorPicker,
		StarIcon,
		NcActionSeparator,
		NcActionInput,
		PaletteOutlineIcon,
		PencilOutlineIcon,
		ShareVariantOutlineIcon,
	},

	props: {
		note: {
			type: Object,
			required: true,
		},

		showCategoryTitle: {
			type: Boolean,
			default: false,
		},
	},

	data() {
		return {
			loading: {
				note: false,
				category: false,
				favorite: false,
				color: false,
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

		categoryTitle() {
			return categoryLabel(this.note.category)
		},

		colorStyle() {
			const color = normalizeColor(this.note.color)
			return color ? { '--np-note-color': color } : {}
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

		actionCategoryText() {
			return categoryLabel(this.note.category)
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

		onMenuChange(state) {
			this.actionsOpen = state
			this.showCategorySelect = false
			this.showColorSelect = false
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

		onNoteSelected(noteId) {
			this.$emit('note-selected', noteId)
		},

		onToggleFavorite() {
			this.loading.favorite = true
			setFavorite(this.note.id, !this.note.favorite)
				.catch(() => {
				})
				.then(() => {
					this.loading.favorite = false
					this.actionsOpen = false
				})
		},

		onToggleArchived() {
			setArchived(this.note.id, !this.note.archived)
				.catch(() => {})
				.then(() => {
					this.actionsOpen = false
				})
		},

		onCategorySelected() {
			this.actionsOpen = false
			this.$emit('category-selected', this.note.category)
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
					this.actionsOpen = false
				})
			} catch (e) {
				logger.error('Error during preparing note for deletion', { error: e })
				showError(this.t('notesplus', 'Error during preparing note for deletion.'))
				this.loading.delete = false
				this.actionsOpen = false
			}
		},

		onToggleSharing() {
			this.actionsOpen = false
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
</script>

<style lang="scss" scoped>
.material-design-icon {
	width: var(--default-clickable-area);
	.list-item__wrapper--active & {
		color: var(--color-primary-element-text) !important;
	}
}

:deep(.list-item) {
	padding: 0;
}

:deep(.list-item__anchor) {
	box-sizing: border-box;
	height: calc(var(--list-item-height) + 2 * var(--default-grid-baseline));
	padding: var(--list-item-padding);
}

.note-item--colored :deep(.list-item__anchor) {
	border-left: 4px solid var(--np-note-color, transparent);
}
</style>
