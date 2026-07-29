/**
 * SPDX-FileCopyrightText: 2026 Paweł Żentała and Notes+ contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Pure URL extraction for link previews (E07). Given the raw note markdown it
 * returns the unique http(s) URLs in the prose, in first-seen order, ignoring
 * anything inside fenced code blocks or inline code spans (those are examples,
 * not links to preview). Trailing sentence punctuation and a wrapping `)` from
 * a markdown link are trimmed off.
 */

const FENCE_RE = /^\s*(```|~~~)/
const URL_RE = /https?:\/\/[^\s<>()[\]"'`]+/g

/**
 * Drop trailing punctuation that is almost never part of the URL.
 *
 * @param url
 */
function trimTrailing(url) {
	return url.replace(/[.,;:!?)\]}>"']+$/, '')
}

/**
 * Remove inline code spans (`like this`) so their URLs are not previewed.
 *
 * @param line
 */
function stripInlineCode(line) {
	return line.replace(/`[^`]*`/g, '')
}

/**
 * @param {string} text the raw note markdown
 * @return {string[]} unique http(s) URLs in first-seen order
 */
export function extractUrls(text) {
	if (!text) {
		return []
	}
	const seen = new Set()
	const result = []
	let inFence = false
	for (const line of text.split('\n')) {
		if (FENCE_RE.test(line)) {
			inFence = !inFence
			continue
		}
		if (inFence) {
			continue
		}
		const matches = stripInlineCode(line).match(URL_RE)
		if (!matches) {
			continue
		}
		for (const raw of matches) {
			const url = trimTrailing(raw)
			if (url && !seen.has(url)) {
				seen.add(url)
				result.push(url)
			}
		}
	}
	return result
}

/**
 * The display host of a URL (no scheme, no `www.`), or the raw url on parse failure.
 *
 * @param url
 */
export function urlHost(url) {
	try {
		return new URL(url).host.replace(/^www\./, '')
	} catch {
		return url
	}
}
