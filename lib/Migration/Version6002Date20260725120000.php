<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Paweł Żentała and Notes+ contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\NotesPlus\Migration;

use Closure;
use OCP\DB\ISchemaWrapper;
use OCP\Migration\IOutput;
use OCP\Migration\SimpleMigrationStep;

/**
 * Notes+ owns its own metadata table `notesplus_meta` (never the upstream
 * `notes_meta`, which belongs to the official Notes app and would be shared if
 * both apps are installed). Instances that were enabled before this migration
 * still lack the table (the base create-migration had already run under the old
 * name), so create it here idempotently. The table is a rebuildable cache — no
 * data migration is needed; MetaService repopulates it from the note files.
 */
class Version6002Date20260725120000 extends SimpleMigrationStep {
	public function changeSchema(IOutput $output, Closure $schemaClosure, array $options) {
		/** @var ISchemaWrapper $schema */
		$schema = $schemaClosure();

		if ($schema->hasTable('notesplus_meta')) {
			return null;
		}

		$table = $schema->createTable('notesplus_meta');
		$table->addColumn('id', 'integer', [
			'autoincrement' => true,
			'notnull' => true,
		]);
		$table->addColumn('file_id', 'integer', [
			'notnull' => true,
		]);
		$table->addColumn('user_id', 'string', [
			'notnull' => true,
			'length' => 64,
		]);
		$table->addColumn('last_update', 'integer', [
			'notnull' => true,
		]);
		$table->addColumn('etag', 'string', [
			'notnull' => true,
			'length' => 32,
		]);
		$table->addColumn('content_etag', 'string', [
			'notnull' => true,
			'length' => 32,
		]);
		$table->addColumn('file_etag', 'string', [
			'notnull' => true,
			'length' => 40,
		]);
		$table->setPrimaryKey(['id']);
		$table->addIndex(['file_id'], 'notesplus_meta_fileid_idx');
		$table->addIndex(['user_id'], 'notesplus_meta_userid_idx');
		$table->addUniqueIndex(['file_id', 'user_id'], 'notesplus_meta_fuser_idx');

		return $schema;
	}
}
