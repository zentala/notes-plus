<!--
  - SPDX-FileCopyrightText: 2026 Paweł Żentała and Notes+ contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<!--
  Renders OpenGraph preview cards for the URLs found in a note's body (E07).
  Extracts URLs with the pure `extractUrls`, resolves each server-side (cached),
  and shows a card only for those that resolve to something rich. Refetch is
  cheap: NotesService caches every URL, so re-renders reuse resolved data.
-->
<template>
	<div v-if="previews.length" class="link-previews">
		<LinkPreview
			v-for="preview in previews"
			:key="preview.url"
			:preview="preview"
		/>
	</div>
</template>

<script>
import LinkPreview from './LinkPreview.vue'
import { extractUrls } from '../link-preview.js'
import { fetchLinkPreview } from '../NotesService.js'

export default {
	name: 'LinkPreviewList',

	components: {
		LinkPreview,
	},

	props: {
		content: {
			type: String,
			default: '',
		},
	},

	data() {
		return {
			previews: [],
			token: 0,
		}
	},

	watch: {
		content: {
			immediate: true,
			handler: 'refresh',
		},
	},

	methods: {
		async refresh() {
			// guard against out-of-order resolution when content changes fast
			const token = ++this.token
			const urls = extractUrls(this.content)
			const resolved = await Promise.all(urls.map((url) => fetchLinkPreview(url)))
			if (token !== this.token) {
				return
			}
			this.previews = resolved.filter((preview) => preview !== null)
		},
	},
}
</script>

<style lang="scss" scoped>
.link-previews {
	padding: 0 1em 1em;
}
</style>
