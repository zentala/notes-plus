<!--
  - SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<!--
  Keep-style card tile for the grid view. Shows title, a plain-text excerpt
  (server-provided note.excerpt — no live markdown render, cheap at 1000s of
  notes), color, and pinned/error/share state. The action menu is the shared
  NoteActionsMenu so the card and the list row never drift.
-->
<template>
	<div
		class="note-card"
		:class="{ 'note-card--colored': !!note.color, 'note-card--selected': isSelected }"
		:style="colorStyle"
		:draggable="isDraggable"
		@dragstart="onDragStart"
	>
		<router-link
			class="note-card__body"
			:to="{ name: 'note', params: { noteId: note.id.toString() } }"
			@click.native="onNoteSelected"
		>
			<div class="note-card__head">
				<AlertOctagonOutlineIcon v-if="note.error" :size="18" fill-color="#E9322D" />
				<StarIcon v-else-if="note.favorite" :size="18" fill-color="#FC0" />
				<ShareVariantOutlineIcon v-if="isShared" :size="16" fill-color="#0082c9" />
			</div>
			<h3 class="note-card__title">
				{{ title }}
			</h3>
			<p v-if="note.excerpt" class="note-card__excerpt">
				{{ note.excerpt }}
			</p>
		</router-link>

		<div class="note-card__actions">
			<NcActions :force-menu="true" @update:open="onMenuChange">
				<NoteActionsMenu
					ref="actions"
					:note="note"
					@note-deleted="onNoteDeleted"
					@start-renaming="onStartRenaming"
				/>
			</NcActions>
		</div>
	</div>
</template>

<script>
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import NcActions from '@nextcloud/vue/components/NcActions'
import AlertOctagonOutlineIcon from 'vue-material-design-icons/AlertOctagonOutline.vue'
import ShareVariantOutlineIcon from 'vue-material-design-icons/ShareVariantOutline.vue'
import StarIcon from 'vue-material-design-icons/Star.vue'
import NoteActionsMenu from './NoteActionsMenu.vue'
import { normalizeColor } from '../notes-colors.js'
import store from '../store.js'

export default {
	name: 'NoteCard',

	components: {
		AlertOctagonOutlineIcon,
		NcActions,
		NoteActionsMenu,
		ShareVariantOutlineIcon,
		StarIcon,
	},

	props: {
		note: {
			type: Object,
			required: true,
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

		onMenuChange(open) {
			if (!open) {
				this.$refs.actions?.resetMenu()
			}
		},

		onNoteSelected() {
			this.$emit('note-selected', this.note.id)
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
.note-card {
	position: relative;
	break-inside: avoid;
	margin-bottom: var(--default-grid-baseline, 4px);
	border: 2px solid var(--color-border);
	border-radius: var(--border-radius-large, 12px);
	background-color: var(--color-main-background);
	overflow: hidden;
}

.note-card--colored {
	border-color: var(--np-note-color, var(--color-border));
	background-color: color-mix(in srgb, var(--np-note-color) 12%, var(--color-main-background));
}

.note-card--selected {
	border-color: var(--color-primary-element);
}

.note-card__body {
	display: block;
	padding: 12px;
	color: var(--color-main-text);
	text-decoration: none;
}

.note-card__head {
	display: flex;
	gap: 4px;
	min-height: 18px;
	margin-bottom: 4px;
}

.note-card__title {
	margin: 0 0 6px;
	font-size: 1rem;
	font-weight: bold;
	line-height: 1.3;
	overflow-wrap: anywhere;
}

.note-card__excerpt {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 0.9rem;
	line-height: 1.4;
	white-space: pre-line;
	overflow-wrap: anywhere;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 12;
	line-clamp: 12;
	overflow: hidden;
}

.note-card__actions {
	position: absolute;
	inset-block-start: 4px;
	inset-inline-end: 4px;
	opacity: 0;
	transition: opacity 0.1s ease-in-out;
}

.note-card:hover .note-card__actions,
.note-card:focus-within .note-card__actions {
	opacity: 1;
}
</style>
