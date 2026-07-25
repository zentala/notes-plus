/**
 * SPDX-FileCopyrightText: 2020 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

__webpack_nonce__ = btoa(OC.requestToken)
__webpack_public_path__ = OC.linkTo('notesplus', 'js/') // eslint-disable-line

document.addEventListener('DOMContentLoaded', () => {
	OCA.Dashboard.register('notesplus', async (el) => {
		const { default: Vue } = await import(/* webpackChunkName: "dashboard-lazy" */'vue')
		const { default: Dashboard } = await import(/* webpackChunkName: "dashboard-lazy" */'./components/Dashboard.vue')
		Vue.mixin({ methods: { t, n } })
		const View = Vue.extend(Dashboard)
		new View().$mount(el)
	})
})
