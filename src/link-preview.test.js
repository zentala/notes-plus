/**
 * SPDX-FileCopyrightText: 2026 Paweł Żentała and Notes+ contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, expect, it } from 'vitest'
import { extractUrls, urlHost } from './link-preview.js'

describe('link-preview URL extraction (E07)', () => {
	it('extracts unique http(s) urls in first-seen order', () => {
		const text = 'see https://a.example and http://b.example\nagain https://a.example\n'
		expect(extractUrls(text)).toEqual(['https://a.example', 'http://b.example'])
	})

	it('trims trailing punctuation and markdown-link parens', () => {
		expect(extractUrls('read (https://x.example/page).')).toEqual(['https://x.example/page'])
		expect(extractUrls('end https://y.example!')).toEqual(['https://y.example'])
	})

	it('ignores urls inside fenced code blocks', () => {
		const text = 'real https://real.example\n```\ncurl https://code.example\n```\n'
		expect(extractUrls(text)).toEqual(['https://real.example'])
	})

	it('ignores urls inside inline code', () => {
		expect(extractUrls('use `https://code.example` here https://real.example')).toEqual(['https://real.example'])
	})

	it('returns empty for no urls or empty input', () => {
		expect(extractUrls('')).toEqual([])
		expect(extractUrls('no links here')).toEqual([])
	})

	it('urlHost strips scheme and www', () => {
		expect(urlHost('https://www.example.com/path')).toBe('example.com')
		expect(urlHost('http://sub.example.org')).toBe('sub.example.org')
	})
})
