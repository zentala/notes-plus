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
		@click="onNoteSelected"
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

			<NcActionButton v-if="!showTagSelect" :close-after-click="false" @click="showTagSelect = true">
				<template #icon>
					<TagOutlineIcon :size="20" />
				</template>
				{{ t('notesplus', 'Add tag') }}
			</NcActionButton>
			<NcActionInput
				v-else
				type="multiselect"
				label="label"
				track-by="id"
				:multiple="false"
				:options="tagOptions"
				:taggable="true"
				@input="onAddTag"
				@tag="onAddTag"
			>
				<template #icon>
					<TagOutlineIcon :size="20" />
				</template>
				{{ t('notesplus', 'Add tag') }}
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
import TagOutlineIcon from 'vue-material-design-icons/TagOutline.vue'
import NoteColorPicker from './NoteColorPicker.vue'
import noteActions from './noteActions.js'

export default {
	name: 'NoteItem',

	components: {
		AlertOctagonOutlineIcon,
		ArchiveArrowDownOutlineIcon,
		ArchiveArrowUpOutlineIcon,
		ChevronLeftIcon,
		FolderOutlineIcon,
		NcActionButton,
		NcActionInput,
		NcActionSeparator,
		NcListItem,
		NoteColorPicker,
		PaletteOutlineIcon,
		PencilOutlineIcon,
		ShareVariantOutlineIcon,
		StarIcon,
		TagOutlineIcon,
	},

	mixins: [noteActions],

	props: {
		showCategoryTitle: {
			type: Boolean,
			default: false,
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
