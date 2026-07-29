<!--
  - SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<!--
  Keep-style card tile for the grid view. Shows title, a plain-text excerpt
  (server-provided note.excerpt — no live markdown render, cheap at 1000s of
  notes), color, and pinned/error/share state. Shared behaviour and the action
  handlers live in the noteActions mixin; the action buttons are inline here
  because NcActions needs its NcActionButton children directly in the slot.
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
			</NcActions>
		</div>
	</div>
</template>

<script>
import NcActionButton from '@nextcloud/vue/components/NcActionButton'
import NcActionInput from '@nextcloud/vue/components/NcActionInput'
import NcActions from '@nextcloud/vue/components/NcActions'
import NcActionSeparator from '@nextcloud/vue/components/NcActionSeparator'
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
import noteActions from './noteActions.js'

export default {
	name: 'NoteCard',

	components: {
		AlertOctagonOutlineIcon,
		ArchiveArrowDownOutlineIcon,
		ArchiveArrowUpOutlineIcon,
		ChevronLeftIcon,
		FolderOutlineIcon,
		NcActionButton,
		NcActionInput,
		NcActions,
		NcActionSeparator,
		NoteColorPicker,
		PaletteOutlineIcon,
		PencilOutlineIcon,
		ShareVariantOutlineIcon,
		StarIcon,
	},

	mixins: [noteActions],
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
