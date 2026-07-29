/**
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

// Nextcloud exposes `t()` as a global translation helper at runtime; unit tests
// substitute an identity so translated strings equal their English source.
globalThis.t = (app, text) => text
