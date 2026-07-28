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
			<NoteActionsMenu
				ref="actions"
				:note="note"
				@note-deleted="onNoteDeleted"
				@start-renaming="onStartRenaming"
			/>
		</template>
	</NcListItem>
</template>

<script>
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import NcListItem from '@nextcloud/vue/components/NcListItem'
import AlertOctagonOutlineIcon from 'vue-material-design-icons/AlertOctagonOutline.vue'
import ShareVariantOutlineIcon from 'vue-material-design-icons/ShareVariantOutline.vue'
import StarIcon from 'vue-material-design-icons/Star.vue'
import NoteActionsMenu from './NoteActionsMenu.vue'
import { normalizeColor } from '../notes-colors.js'
import store from '../store.js'
import { categoryLabel } from '../Util.js'

export default {
	name: 'NoteItem',

	components: {
		AlertOctagonOutlineIcon,
		NcListItem,
		NoteActionsMenu,
		ShareVariantOutlineIcon,
		StarIcon,
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
			if (!state) {
				this.$refs.actions?.resetMenu()
			}
		},

		onNoteSelected(noteId) {
			this.$emit('note-selected', noteId)
		},

		onStartRenaming(noteId) {
			this.$emit('start-renaming', noteId)
		},

		onNoteDeleted(note) {
			this.$emit('note-deleted', note)
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
