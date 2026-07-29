/**
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue2'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	plugins: [vue()],
	test: {
		environment: 'jsdom',
		include: ['src/**/*.test.js', 'tools/**/*.test.js'],
		setupFiles: [fileURLToPath(new URL('./src/test-setup.js', import.meta.url))],
	},
})
