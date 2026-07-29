/**
 * SPDX-FileCopyrightText: 2026 Paweł Żentała and Notes+ contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Shared, pure checklist model for both editors (E06). The read-mode preview
 * (markdown-it) and the edit-mode CodeMirror used to carry two independent
 * regex/DOM toggle implementations that could drift; this module is the single
 * source of truth. Every function is pure: given the raw note markdown it
 * returns new markdown, patching only checklist lines and never round-tripping
 * the whole body.
 *
 * A "checklist item" is a top-level or nested list line of the form
 * `- [ ] text` / `* [x] text` (markers -, +, *), NOT inside a fenced code block.
 * Nesting is by leading-whitespace indent; we support one level (Keep-match).
 */

// A task line: indent, list marker, checkbox state, trailing text.
const TASK_RE = /^(\s*)([-+*])\s+\[([ xX\u00A0])\](\s.*)?$/
// A fenced code-block delimiter (``` or ~~~) — task lines inside are code.
const FENCE_RE = /^\s*(```|~~~)/

function isChecked(mark) {
	return mark === 'x' || mark === 'X'
}

/**
 * Parse the note body into checklist items in document (rendered checkbox)
 * order, skipping anything inside a fenced code block. The Nth item here is the
 * Nth checkbox the preview renders, so its `line` is the safe target to toggle.
 *
 * @param {string} text the raw note markdown
 * @return {Array<{line: number, indent: number, checked: boolean, marker: string, text: string}>}
 */
export function parseChecklist(text) {
	const lines = text.split('\n')
	const items = []
	let inFence = false
	lines.forEach((line, index) => {
		if (FENCE_RE.test(line)) {
			inFence = !inFence
			return
		}
		if (inFence) {
			return
		}
		const m = line.match(TASK_RE)
		if (m) {
			items.push({
				line: index,
				indent: m[1].length,
				checked: isChecked(m[3]),
				marker: m[2],
				text: (m[4] || '').trim(),
			})
		}
	})
	return items
}

/**
 * Rewrite the checkbox on one source line to the given state.
 *
 * @param text
 * @param lineIndex
 * @param checked
 */
export function setCheckedLine(text, lineIndex, checked) {
	const lines = text.split('\n')
	if (lineIndex < 0 || lineIndex >= lines.length) {
		return text
	}
	lines[lineIndex] = lines[lineIndex].replace(/\[([ xX\u00A0])\]/, checked ? '[x]' : '[ ]')
	return lines.join('\n')
}

/**
 * Set the checkbox state of the checklist item at the given ordinal (its index
 * among rendered checkboxes). This is how the preview toggles: it knows the
 * clicked checkbox's ordinal, not its source line, so it maps through here and
 * cannot be fooled by `- [ ]` text inside a code fence.
 *
 * @param text
 * @param ordinal
 * @param checked
 */
export function setCheckedAt(text, ordinal, checked) {
	const item = parseChecklist(text)[ordinal]
	return item ? setCheckedLine(text, item.line, checked) : text
}

/**
 * Toggle the checklist item at the given ordinal.
 *
 * @param text
 * @param ordinal
 */
export function toggleAt(text, ordinal) {
	const item = parseChecklist(text)[ordinal]
	return item ? setCheckedLine(text, item.line, !item.checked) : text
}

/**
 * Whether the note has at least one checklist item.
 *
 * @param text
 */
export function hasChecklist(text) {
	return parseChecklist(text).length > 0
}

/**
 * Bulk: uncheck every item, leaving text and structure untouched.
 *
 * @param text
 */
export function uncheckAll(text) {
	const lines = text.split('\n')
	for (const item of parseChecklist(text)) {
		lines[item.line] = lines[item.line].replace(/\[[xX]\]/, '[ ]')
	}
	return lines.join('\n')
}

/**
 * Bulk: delete completed items. A checked parent takes its indented subtree
 * with it (the children belong to it); a checked child under an unchecked
 * parent is removed on its own. No parent→child state cascade.
 *
 * @param text
 */
export function deleteCompleted(text) {
	const lines = text.split('\n')
	const items = parseChecklist(text)
	const remove = new Set()
	for (let i = 0; i < items.length; i++) {
		if (!items[i].checked) {
			continue
		}
		remove.add(items[i].line)
		for (let j = i + 1; j < items.length && items[j].indent > items[i].indent; j++) {
			remove.add(items[j].line)
		}
	}
	return lines.filter((_, index) => !remove.has(index)).join('\n')
}

/**
 * Bulk auto-sink: within each contiguous checklist block, move top-level items
 * whose checkbox is checked (with their whole subtree) to the bottom of the
 * block, keeping relative order stable. A checked child under an unchecked
 * parent does NOT move (no cascade, Keep-match).
 *
 * @param text
 */
export function sinkChecked(text) {
	const lines = text.split('\n')
	const items = parseChecklist(text)
	if (items.length === 0) {
		return text
	}
	// split items into runs of consecutive source lines (one checklist block each)
	const runs = []
	let run = [items[0]]
	for (let i = 1; i < items.length; i++) {
		if (items[i].line === items[i - 1].line + 1) {
			run.push(items[i])
		} else {
			runs.push(run)
			run = [items[i]]
		}
	}
	runs.push(run)

	for (const block of runs) {
		const baseIndent = Math.min(...block.map((it) => it.indent))
		// group each top-level item with its following deeper-indented children
		const groups = []
		for (const it of block) {
			if (it.indent === baseIndent || groups.length === 0) {
				groups.push({ leader: it, lines: [it.line] })
			} else {
				groups[groups.length - 1].lines.push(it.line)
			}
		}
		const kept = groups.filter((g) => !(g.leader.indent === baseIndent && g.leader.checked))
		const sunk = groups.filter((g) => g.leader.indent === baseIndent && g.leader.checked)
		if (sunk.length === 0) {
			continue
		}
		const orderedLines = [...kept, ...sunk].flatMap((g) => g.lines)
		const originalLines = block.map((it) => it.line)
		const start = originalLines[0]
		const reordered = orderedLines.map((lineIndex) => lines[lineIndex])
		lines.splice(start, reordered.length, ...reordered)
	}
	return lines.join('\n')
}
