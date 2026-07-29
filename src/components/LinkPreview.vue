<!--
  - SPDX-FileCopyrightText: 2026 Paweł Żentała and Notes+ contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<!--
  One OpenGraph link-preview card (E07). Presentational: the parent resolves the
  preview server-side (Nextcloud reference cache) and passes the data in.
-->
<template>
	<a
		class="link-preview"
		:href="preview.url"
		target="_blank"
		rel="noopener noreferrer"
	>
		<span
			v-if="preview.imageUrl"
			class="link-preview__thumb"
			:style="{ backgroundImage: `url('${encodeURI(preview.imageUrl)}')` }"
		/>
		<span class="link-preview__body">
			<span v-if="preview.title" class="link-preview__title">{{ preview.title }}</span>
			<span v-if="preview.description" class="link-preview__desc">{{ preview.description }}</span>
			<span class="link-preview__host">{{ host }}</span>
		</span>
	</a>
</template>

<script>
import { urlHost } from '../link-preview.js'

export default {
	name: 'LinkPreview',

	props: {
		preview: {
			type: Object,
			required: true,
		},
	},

	computed: {
		host() {
			return urlHost(this.preview.url)
		},
	},
}
</script>

<style lang="scss" scoped>
.link-preview {
	display: flex;
	max-width: 480px;
	margin: 1ex 0;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 12px);
	overflow: hidden;
	text-decoration: none;
	color: var(--color-main-text);
}

.link-preview:hover {
	border-color: var(--color-primary-element);
}

.link-preview__thumb {
	flex: 0 0 96px;
	background-size: cover;
	background-position: center;
	background-color: var(--color-background-dark);
}

.link-preview__body {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 10px 12px;
	min-width: 0;
}

.link-preview__title {
	font-weight: bold;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.link-preview__desc {
	color: var(--color-text-maxcontrast);
	font-size: 0.9rem;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	overflow: hidden;
}

.link-preview__host {
	color: var(--color-text-maxcontrast);
	font-size: 0.8rem;
}
</style>
