<!--
  - SPDX-FileCopyrightText: 2019 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
	<NcAppSettingsDialog
		:name="t('notesplus', 'Notes settings')"
		:class="{ loading: saving }"
		:show-navigation="true"
		:open="settingsOpen"
		:legacy="false"
		@update:open="setSettingsOpen($event)"
	>
		<NcAppSettingsSection id="note-mode-section" :name="t('notesplus', 'General')">
			<NcRadioGroup
				v-model="settings.noteMode"
				:label="t('notesplus', 'Display')"
				@update:modelValue="onChangeSettings"
			>
				<NcRadioGroupButton
					v-for="mode in noteModes"
					id="noteMode"
					:key="mode.value"
					:label="mode.label"
					:value="mode.value"
				>
					<template #icon>
						<component
							:is="mode.icon"
							:size="20"
						/>
					</template>
				</NcRadioGroupButton>
			</NcRadioGroup>

			<NcRadioGroup
				v-model="settings.fileSuffix"
				:label="t('notesplus', 'File extension')"
				:description="t('notesplus', 'For new notes')"
				@update:modelValue="onChangeSettings"
			>
				<NcRadioGroupButton
					v-for="extension in extensions"
					:key="extension.value"
					:label="extension.label"
					:value="extension.value"
				/>
			</NcRadioGroup>
			<NcTextField v-show="settings.fileSuffix === 'custom'"
				id="customSuffix"
				:label="t('notesplus', 'Custom file extension')"
				placeholder=".txt"
				@change="onChangeSettings"
			/>

			<NcFormGroup :label="t('notesplus', 'Files')">
				<NcFormBox>
					<NcFormBoxButton :label="t('notesplus', 'Notes folder')"
						:description=" '/' + settings.notesPath"
						inverted-accent
						@click="onChangeNotePath"
					>
						<template #icon>
							<FolderOpenOutlineIcon :size="20" />
						</template>
					</NcFormBoxButton>
				</NcFormBox>
			</NcFormGroup>
		</NcAppSettingsSection>

		<NcAppSettingsSection :name="t('notesplus', 'Mobile apps')">
			<HelpMobile />
		</NcAppSettingsSection>

		<NcAppSettingsShortcutsSection :name="t('notesplus', 'Shortcuts')">
			<NcHotkeyList>
				<NcHotkey v-for="(item, index) in shortcuts"
					:key="index"
					:label="item.action"
					:hotkey="item.shortcut"
				/>
			</NcHotkeyList>
		</NcAppSettingsShortcutsSection>
	</NcAppSettingsDialog>
</template>

<script>
import { getFilePickerBuilder } from '@nextcloud/dialogs'
import NcAppSettingsDialog from '@nextcloud/vue/components/NcAppSettingsDialog'
import NcAppSettingsSection from '@nextcloud/vue/components/NcAppSettingsSection'
import NcAppSettingsShortcutsSection from '@nextcloud/vue/components/NcAppSettingsShortcutsSection'
import NcFormBox from '@nextcloud/vue/components/NcFormBox'
import NcFormBoxButton from '@nextcloud/vue/components/NcFormBoxButton'
import NcFormGroup from '@nextcloud/vue/components/NcFormGroup'
import NcHotkey from '@nextcloud/vue/components/NcHotkey'
import NcHotkeyList from '@nextcloud/vue/components/NcHotkeyList'
import NcRadioGroup from '@nextcloud/vue/components/NcRadioGroup'
import NcRadioGroupButton from '@nextcloud/vue/components/NcRadioGroupButton'
import NcTextField from '@nextcloud/vue/components/NcTextField'
import EyeOutlineIcon from 'vue-material-design-icons/EyeOutline.vue'
import FolderOpenOutlineIcon from 'vue-material-design-icons/FolderOpenOutline.vue'
import FormatAlignLeftIcon from 'vue-material-design-icons/FormatAlignLeft.vue'
import NewspaperVariantOutlineIcon from 'vue-material-design-icons/NewspaperVariantOutline.vue'
import HelpMobile from './HelpMobile.vue'
import { setSettings } from '../NotesService.js'
import store from '../store.js'

export default {
	name: 'AppSettings',

	components: {
		NcTextField,
		NcAppSettingsDialog,
		NcAppSettingsSection,
		HelpMobile,
		NcAppSettingsShortcutsSection,
		NcHotkeyList,
		NcHotkey,
		NcRadioGroup,
		NcRadioGroupButton,
		NcFormBox,
		NcFormBoxButton,
		NcFormGroup,
		EyeOutlineIcon,
		FormatAlignLeftIcon,
		NewspaperVariantOutlineIcon,
		FolderOpenOutlineIcon,
	},

	props: {
		open: Boolean,
	},

	data() {
		return {
			extensions: [
				{ value: '.md', label: '.md' },
				{ value: '.txt', label: '.txt' },
				{ value: 'custom', label: t('notesplus', 'Custom') },
			],

			noteModes: [
				{ value: 'rich', label: t('notesplus', 'Rich text'), icon: 'NewspaperVariantOutlineIcon' },
				{ value: 'edit', label: t('notesplus', 'Plain text'), icon: 'FormatAlignLeftIcon' },
				{ value: 'preview', label: t('notesplus', 'Preview'), icon: 'EyeOutlineIcon' },
			],

			saving: false,
			settingsOpen: this.open,
			shortcuts: [
				{ shortcut: 'Control B', action: t('notesplus', 'Make the selection bold') },
				{ shortcut: 'Control I', action: t('notesplus', 'Make the selection italic') },
				{ shortcut: 'Control +', action: t('notesplus', 'Wrap the selection in quotes') },
				{ shortcut: 'Control Alt C', action: t('notesplus', 'The selection will be turned into monospace') },
				{ shortcut: 'Control E', action: t('notesplus', 'Remove any styles from the selected text') },
				{ shortcut: 'Control L', action: t('notesplus', 'Makes the current line a list element') },
				{ shortcut: 'Control Alt L', action: t('notesplus', 'Makes the current line a list element with a number') },
				{ shortcut: 'Control H', action: t('notesplus', 'Toggle heading for current line') },
				{ shortcut: 'Control Shift H', action: t('notesplus', 'Set the current line as a big heading') },
				{ shortcut: 'Control K', action: t('notesplus', 'Insert link') },
				{ shortcut: 'Control Alt I', action: t('notesplus', 'Insert image') },
				{ shortcut: 'Control /', action: t('notesplus', 'Switch between editor and viewer') },
			],
		}
	},

	computed: {
		settings() {
			return store.app.settings
		},
	},

	watch: {
		open(newValue) {
			this.settingsOpen = newValue
		},
	},

	created() {
		if (!window.OCA.Text?.createEditor) {
			this.noteModes.splice(0, 1)
		}
	},

	methods: {
		async onChangeNotePath(event) {
			const filePicker = getFilePickerBuilder(t('notesplus', 'Pick a notes folder'))
				.allowDirectories(true)
				.startAt(event.target.value === '' ? '/' : event.target.value)
				.addButton({
					label: t('notesplus', 'Set notes folder'),
					callback: (nodes) => {
						const node = nodes[0]
						this.settings.notesPath = node.path
						this.onChangeSettingsReload()
					},
				})
				.build()

			await filePicker.pick()
		},

		onChangeSettings() {
			this.saving = true
			return setSettings(this.settings)
				.catch(() => {
				})
				.then(() => {
					this.saving = false
				})
		},

		onChangeSettingsReload() {
			this.onChangeSettings()
				.then(() => {
					this.$emit('reload')
				})
		},

		setSettingsOpen(newValue) {
			this.settingsOpen = newValue
			this.$emit('update:open', newValue)
		},
	},
}
</script>

<style scoped>
.loading .settings-block {
	visibility: hidden;
}

.settings-block + .settings-block {
	padding-top: 2ex;
}

.settings-block form {
	display: inline-flex;
}
</style>
