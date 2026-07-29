/**
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { TestInfo } from '@playwright/test'

import { expect, test } from '@playwright/test'
import { login } from '../support/login.ts'
import { createNote, newNoteButton, uniqueTitle } from '../support/note.ts'

test.describe('List/grid view toggle', () => {
	test.beforeEach(async ({ page }) => {
		await login(page)
		await page.goto('/index.php/apps/notesplus/')
		await expect(newNoteButton(page)).toBeVisible()
	})

	test('switches to the card grid and persists the choice across reload', async ({ page }, testInfo: TestInfo) => {
		const title = uniqueTitle('grid', testInfo)
		const noteId = await createNote(page, title)

		const card = page.locator(`.note-card:has(a[href$="/note/${noteId}"])`)
		await expect(card).toHaveCount(0)

		// switch to grid: the note now renders as a card
		await page.getByRole('button', { name: 'Grid view' }).click()
		await expect(card).toBeVisible()

		// the choice survives a full reload (localStorage)
		await page.reload()
		await expect(newNoteButton(page)).toBeVisible()
		await expect(card).toBeVisible()

		// switching back to list drops the cards
		await page.getByRole('button', { name: 'List view' }).click()
		await expect(card).toHaveCount(0)
	})
})
