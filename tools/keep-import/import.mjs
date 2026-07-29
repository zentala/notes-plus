#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Paweł Żentała and Notes+ contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Google Keep (Takeout) → Notes+ importer.
 *
 * Dry-run by default (parses + prints a plan, no writes). Pass --apply to create
 * notes. Idempotent: a state file maps each Keep note to the note it created, so
 * re-running skips already-imported notes and never clobbers server edits (the
 * importer only ever CREATES). The Keep source id is also embedded in each note's
 * front-matter, so dedup survives a lost state file (see README).
 *
 * Usage:
 *   node import.mjs --takeout <dir> [--apply] [--include-archived] [--check]
 *   NOTES_URL=https://nextcloud.internal NOTES_USER=me NOTES_PASSWORD=<app-pw> \
 *     node import.mjs --takeout ./Takeout/Keep --apply
 *
 * Secrets come from the environment only (use password-broker inject) — never a flag.
 */

/* eslint-disable no-console -- this is a CLI: its report goes to stdout/stderr */

import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { contentWithSourceId, mapKeepNote } from './keep.mjs'
import { NotesClient } from './notes-client.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))

function parseArgs(argv) {
	const args = { takeout: null, apply: false, includeArchived: false, check: false, state: null }
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === '--takeout') {
			args.takeout = argv[++i]
		} else if (a === '--apply') {
			args.apply = true
		} else if (a === '--include-archived') {
			args.includeArchived = true
		} else if (a === '--check') {
			args.check = true
		} else if (a === '--state') {
			args.state = argv[++i]
		}
	}
	return args
}

/** Read every `*.json` Keep note in a directory into parsed objects. */
async function readNotes(dir) {
	const entries = await readdir(dir)
	const notes = []
	for (const name of entries) {
		if (!name.toLowerCase().endsWith('.json')) continue
		try {
			const obj = JSON.parse(await readFile(join(dir, name), 'utf8'))
			if ('textContent' in obj || 'listContent' in obj || 'title' in obj) {
				notes.push(obj)
			}
		} catch (err) {
			console.warn(`skip ${name}: ${err.message}`)
		}
	}
	return notes
}

async function loadState(path) {
	return existsSync(path) ? JSON.parse(await readFile(path, 'utf8')) : {}
}

async function saveState(path, state) {
	await mkdir(dirname(path), { recursive: true })
	await writeFile(path, JSON.stringify(state, null, 2))
}

function summarize(plan) {
	const by = (r) => plan.filter((p) => p.reason === r).length
	console.log('\n=== Keep → Notes+ import plan ===')
	console.log(`  notes read:         ${plan.length}`)
	console.log(`  to import (new):    ${plan.filter((p) => p.do).length}`)
	console.log(`  already imported:   ${by('already')}`)
	console.log(`  skipped (trashed):  ${by('trashed')}`)
	console.log(`  skipped (archived): ${by('archived')}`)
	console.log(`  list→flat notes:    ${plan.filter((p) => p.do && p.lossyFlattened).length}`)
	const withAttach = plan.filter((p) => p.do && p.hasAttachments).length
	if (withAttach > 0) {
		console.log(`  ⚠ notes with attachments: ${withAttach} — text imported, images NOT`)
		console.log('    uploaded by this importer (re-attach manually if needed).')
	}
	console.log('')
}

async function main() {
	const args = parseArgs(process.argv.slice(2))
	const baseUrl = process.env.NOTES_URL ?? 'https://nextcloud.internal'
	const user = process.env.NOTES_USER ?? ''
	const password = process.env.NOTES_PASSWORD ?? ''
	const statePath = args.state ?? join(HERE, '.state.json')

	if (args.check) {
		if (!user || !password) return fail('NOTES_USER / NOTES_PASSWORD not set')
		const ok = await new NotesClient({ baseUrl, user, password }).ping()
		console.log(ok ? `Notes+ reachable at ${baseUrl}` : `Notes+ NOT reachable at ${baseUrl}`)
		process.exit(ok ? 0 : 1)
	}

	if (!args.takeout) return fail('--takeout <dir> is required (path to Takeout/Keep)')
	if (!existsSync(args.takeout)) return fail(`takeout dir not found: ${args.takeout}`)

	const notes = await readNotes(args.takeout)
	const state = await loadState(statePath)

	const plan = notes.map((note) => {
		const mapped = mapKeepNote(note, { includeArchived: args.includeArchived })
		if (mapped.skip) {
			return { do: false, reason: mapped.skip, title: note.title }
		}
		if (state[mapped.sourceId]) {
			return { do: false, reason: 'already', title: mapped.title }
		}
		return { do: true, ...mapped }
	})

	summarize(plan)

	if (!args.apply) {
		console.log('Dry-run only. Re-run with --apply to create notes.')
		return
	}
	if (!user || !password) return fail('NOTES_USER / NOTES_PASSWORD not set — cannot --apply')

	const client = new NotesClient({ baseUrl, user, password })
	let created = 0
	for (const p of plan.filter((x) => x.do)) {
		try {
			const id = await client.createNote({
				title: p.title,
				content: contentWithSourceId(p),
				category: p.category,
				favorite: p.favorite,
				color: p.color,
				archived: p.archived,
				tags: p.tags,
				modified: p.modified || undefined,
			})
			state[p.sourceId] = id
			created++
			await saveState(statePath, state) // persist per-note → safe to resume
		} catch (err) {
			console.error(`FAILED "${p.title}": ${err.message}`)
		}
	}
	console.log(`\n✓ created ${created} note(s). State: ${statePath}`)
}

function fail(msg) {
	console.error(`Error: ${msg}`)
	process.exit(1)
}

main().catch((err) => fail(err.stack ?? err.message))
