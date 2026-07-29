<!--
  - SPDX-FileCopyrightText: 2026 Paweł Żentała and Notes+ contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<!--
  Colored tag chips shown on a note tile/row (E05). Presentational only: the
  parent supplies the resolved { name, color } list and handles filter/remove.
  A chip tints itself from its palette colour via the --np-tag-color custom
  property; uncoloured tags fall back to the neutral border.
-->
<template>
	<ul v-if="tags.length" class="tag-chips">
		<li v-for="tag in tags" :key="tag.name" class="tag-chips__item">
			<button
				type="button"
				class="tag-chips__chip"
				:class="{ 'tag-chips__chip--colored': !!tag.color }"
				:style="tag.color ? { '--np-tag-color': tag.color } : {}"
				:title="t('notesplus', 'Filter by tag {tag}', { tag: tag.name })"
				@click.stop.prevent="$emit('filter', tag.name)"
			>
				<span class="tag-chips__label">{{ tag.name }}</span>
				<span
					v-if="removable"
					class="tag-chips__remove"
					:title="t('notesplus', 'Remove tag {tag}', { tag: tag.name })"
					@click.stop.prevent="$emit('remove', tag.name)"
				>×</span>
			</button>
		</li>
	</ul>
</template>

<script>
export default {
	name: 'TagChips',

	props: {
		tags: {
			type: Array,
			default: () => [],
		},

		removable: {
			type: Boolean,
			default: false,
		},
	},
}
</script>

<style lang="scss" scoped>
.tag-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.tag-chips__chip {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	max-width: 100%;
	margin: 0;
	padding: 1px 8px;
	border: 1px solid var(--color-border-dark);
	border-radius: var(--border-radius-pill, 100px);
	background-color: var(--color-background-hover);
	color: var(--color-main-text);
	font-size: 0.75rem;
	line-height: 1.4;
	cursor: pointer;
}

.tag-chips__chip--colored {
	border-color: var(--np-tag-color);
	background-color: color-mix(in srgb, var(--np-tag-color) 22%, var(--color-main-background));
}

.tag-chips__label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.tag-chips__remove {
	font-weight: bold;
	opacity: 0.6;
}

.tag-chips__remove:hover {
	opacity: 1;
}
</style>
