/**
 * SPDX-FileCopyrightText: 2026 Paweł Żentała and Notes+ contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Thin Notes+ REST client for the Keep importer. Uses Nextcloud Basic auth with
 * an app password (never a login password). The Notes+ API accepts every field
 * the importer needs on create (title, content, category, favorite, color,
 * archived, tags, modified), so one POST per note sets everything.
 */
export class NotesClient {
	constructor({ baseUrl, user, password }) {
		this.base = baseUrl.replace(/\/+$/, '')
		this.auth = 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64')
	}

	get apiUrl() {
		return `${this.base}/index.php/apps/notesplus/api/v1/notes`
	}

	async request(method, url, body) {
		const response = await fetch(url, {
			method,
			headers: {
				Authorization: this.auth,
				'Content-Type': 'application/json',
				'OCS-APIRequest': 'true',
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		})
		if (!response.ok) {
			const text = await response.text().catch(() => '')
			throw new Error(`HTTP ${response.status} ${response.statusText} ${text.slice(0, 200)}`)
		}
		return response
	}

	/** Cheap auth/reachability check. */
	async ping() {
		try {
			await this.request('GET', `${this.apiUrl}?exclude=content,excerpt`)
			return true
		} catch {
			return false
		}
	}

	/**
	 * Create one note from a mapped Keep record. Returns the new note id.
	 *
	 * @param {object} payload title/content/category/favorite/color/archived/tags/modified
	 * @return {Promise<number>}
	 */
	async createNote(payload) {
		const response = await this.request('POST', this.apiUrl, payload)
		const data = await response.json()
		return data.id
	}
}
