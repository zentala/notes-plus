<!--
  - SPDX-FileCopyrightText: 2026 Paweł Żentała and Notes+ contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
	<div class="note-color-picker" role="group" :aria-label="t('notesplus', 'Note color')">
		<button v-for="color in noteColors"
			:key="color.id"
			class="note-color-picker__swatch"
			:class="{ 'note-color-picker__swatch--active': isActive(color.value), 'note-color-picker__swatch--none': color.value === null }"
			:style="color.value ? { backgroundColor: color.value } : {}"
			:title="color.label"
			:aria-label="color.label"
			:aria-pressed="isActive(color.value)"
			type="button"
			@click="$emit('select', color.value)"
		/>
	</div>
</template>

<script>
import { normalizeColor, noteColors } from '../notes-colors.js'

export default {
	name: 'NoteColorPicker',

	props: {
		value: {
			type: String,
			default: null,
		},
	},

	data() {
		return { noteColors }
	},

	methods: {
		isActive(colorValue) {
			return normalizeColor(this.value) === normalizeColor(colorValue)
		},
	},
}
</script>

<style lang="scss" scoped>
.note-color-picker {
	display: grid;
	grid-template-columns: repeat(6, 1fr);
	gap: 6px;
	padding: 8px 12px;
}

.note-color-picker__swatch {
	width: 24px;
	height: 24px;
	border-radius: 50%;
	border: 2px solid var(--color-border-dark);
	cursor: pointer;
	padding: 0;

	&--none {
		background:
			linear-gradient(to top left, transparent 45%, var(--color-error) 45%, var(--color-error) 55%, transparent 55%),
			var(--color-main-background);
	}

	&--active {
		border-color: var(--color-primary-element);
		box-shadow: 0 0 0 2px var(--color-primary-element);
	}
}
</style>
