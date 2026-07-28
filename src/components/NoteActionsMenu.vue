<!--
  - SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<!--
  Shared note action buttons (favorite, archive, share, color, category, rename,
  delete). Rendered as a <Fragment> so the NcActionButtons hoist into the parent
  NcActions/NcListItem menu — see the vue-frag pattern in CategoriesList.vue.
  Used by both NoteItem (list row) and NoteCard (grid tile) so the menu never
  drifts between the two.
-->
<template>
	<Fragment>
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
	</Fragment>
</template>

<script>
import { showError } from '@nextcloud/dialogs'
import { emit } from '@nextcloud/event-bus'
import { Fragment } from 'vue-frag'
import NcActionButton from '@nextcloud/vue/components/NcActionButton'
import NcActionInput from '@nextcloud/vue/components/NcActionInput'
import NcActionSeparator from '@nextcloud/vue/components/NcActionSeparator'
import ArchiveArrowDownOutlineIcon from 'vue-material-design-icons/ArchiveArrowDownOutline.vue'
import ArchiveArrowUpOutlineIcon from 'vue-material-design-icons/ArchiveArrowUpOutline.vue'
import ChevronLeftIcon from 'vue-material-design-icons/ChevronLeft.vue'
import FolderOutlineIcon from 'vue-material-design-icons/FolderOutline.vue'
import PaletteOutlineIcon from 'vue-material-design-icons/PaletteOutline.vue'
import PencilOutlineIcon from 'vue-material-design-icons/PencilOutline.vue'
import ShareVariantOutlineIcon from 'vue-material-design-icons/ShareVariantOutline.vue'
import NoteColorPicker from './NoteColorPicker.vue'
import logger from '../Logger.js'
import { deleteNote, fetchNote, setArchived, setCategory, setColor, setFavorite, setTitle } from '../NotesService.js'
import store from '../store.js'
import { categoryLabel, routeIsNewNote } from '../Util.js'

export default {
	name: 'NoteActionsMenu',

	components: {
		Fragment,
		ArchiveArrowDownOutlineIcon,
		ArchiveArrowUpOutlineIcon,
		ChevronLeftIcon,
		FolderOutlineIcon,
		NcActionButton,
		NcActionInput,
		NcActionSeparator,
		NoteColorPicker,
		PaletteOutlineIcon,
		PencilOutlineIcon,
		ShareVariantOutlineIcon,
	},

	props: {
		note: {
			type: Object,
			required: true,
		},
	},

	data() {
		return {
			loading: {
				category: false,
				favorite: false,
				color: false,
				delete: false,
				note: false,
			},

			newTitle: '',
			renaming: false,
			showCategorySelect: false,
			showColorSelect: false,
		}
	},

	computed: {
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

	methods: {
		// Called by the host when its menu closes, to reset transient sub-panels.
		resetMenu() {
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
	},
}
</script>
