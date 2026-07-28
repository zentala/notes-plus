<!--
  - SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<!--
  Masonry card container for the grid view — the grid-mode sibling of NotesList.
  Layout is CSS multi-column masonry (column-width + break-inside: avoid on the
  card): true variable-height Keep look with zero layout JS. Windowed
  virtualization of the grid is a deferred follow-up (see the E04 spike); the
  list view is the path that gets virtualization first.
-->
<template>
	<div class="notes-grid">
		<NoteCard v-for="note in notes"
			:key="note.id"
			:note="note"
			@note-selected="onNoteSelected"
			@note-deleted="onNoteDeleted"
			@start-renaming="onStartRenaming"
		/>
	</div>
</template>

<script>
import NoteCard from './NoteCard.vue'

export default {
	name: 'NotesGrid',

	components: {
		NoteCard,
	},

	props: {
		notes: {
			type: Array,
			required: true,
		},
	},

	methods: {
		onNoteSelected(noteId) {
			this.$emit('note-selected', noteId)
		},

		onNoteDeleted(note) {
			this.$emit('note-deleted', note)
		},

		onStartRenaming(noteId) {
			this.$emit('start-renaming', noteId)
		},
	},
}
</script>

<style lang="scss" scoped>
.notes-grid {
	column-width: 240px;
	column-gap: var(--default-grid-baseline, 4px);
	padding: var(--default-grid-baseline, 4px);
}
</style>
