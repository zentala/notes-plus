<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2020 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\NotesPlus\Tests\API;

class APIv1Test extends CommonAPITest {
	protected array $requiredSettings = [
		'notesPath' => 'string',
		'fileSuffix' => 'string',
	];

	public function __construct() {
		parent::__construct('1.3', false);
	}

	/** @depends testCheckForReferenceNotes */
	public function testReadOnlyNote(array $refNotes) : void {
		$readOnlyNotes = array_values(array_filter($refNotes, function ($note) {
			return $note->readonly;
		}));
		$this->assertNotEmpty($readOnlyNotes, 'List of read only notes');
		$note = clone $readOnlyNotes[0];
		unset($note->etag);
		$favorite = $note->favorite;
		// request with all attributes (unchanged) and just change favorite should succeed
		$upd = clone $note;
		$upd->favorite = !$favorite;
		$this->updateNote($note, $upd, (object)[]);
		// changing other attributes should fail
		$this->updateNote($note, (object)[ 'content' => 'New content' ], (object)[], null, 403);
		$this->updateNote($note, (object)[ 'title' => 'New title' ], (object)[], null, 403);
		$this->updateNote($note, (object)[ 'category' => 'New category' ], (object)[], null, 403);
		$this->updateNote($note, (object)[ 'modified' => 700 ], (object)[], null, 403);
		// change favorite back to origin
		$this->updateNote($note, (object)[
			'favorite' => $favorite,
		], (object)[
		]);
		// delete should fail
		$response = $this->http->request('DELETE', 'notes/' . $note->id);
		$this->checkResponse($response, 'Delete read-only note note', 403);
		// test if nothing has changed
		$this->checkGetReferenceNotes($refNotes, 'After read-only tests');
	}

	/** @depends testCheckForReferenceNotes */
	public function testColor() : void {
		$note = $this->createNote((object)[
			'category' => '',
			'title' => 'Color note',
			'content' => '# Color note' . PHP_EOL . 'body',
		], (object)[]);

		// set a valid color and read it back
		$rn = $this->updateNote($note, (object)[ 'color' => '#F28B82' ], (object)[ 'color' => '#f28b82' ]);
		$this->assertEquals('#f28b82', $rn->color, 'Color set and lower-cased');
		$response = $this->http->request('GET', 'notes/' . $note->id);
		$this->checkResponse($response, 'Get colored note', 200);
		$this->assertEquals('#f28b82', json_decode($response->getBody()->getContents())->color, 'Color persisted');

		// an invalid color is rejected with 400 and does not change the note
		$response = $this->http->request('PUT', 'notes/' . $note->id, [ 'json' => (object)[ 'color' => 'notacolor' ] ]);
		$this->checkResponse($response, 'Reject invalid color', 400);
		$response = $this->http->request('GET', 'notes/' . $note->id);
		$this->assertEquals('#f28b82', json_decode($response->getBody()->getContents())->color, 'Color unchanged after invalid');

		// clearing the color removes it
		$rn = $this->updateNote($note, (object)[ 'color' => '' ], (object)[ 'color' => null ]);
		$this->assertNull($rn->color, 'Color cleared');

		$this->http->request('DELETE', 'notes/' . $note->id);
	}

	/** @depends testCheckForReferenceNotes */
	public function testArchived() : void {
		$note = $this->createNote((object)[
			'category' => '',
			'title' => 'Archive note',
			'content' => '# Archive note' . PHP_EOL . 'body',
		], (object)[]);
		$this->assertFalse($note->archived, 'New note is not archived');

		$etagBefore = $this->http->request('GET', 'notes/' . $note->id)->getHeaderLine('ETag');

		// archive it and read it back
		$rn = $this->updateNote($note, (object)[ 'archived' => true ], (object)[ 'archived' => true ]);
		$this->assertTrue($rn->archived, 'Note archived');
		$response = $this->http->request('GET', 'notes/' . $note->id);
		$this->checkResponse($response, 'Get archived note', 200);
		$this->assertTrue(json_decode($response->getBody()->getContents())->archived, 'Archived persisted');
		$this->assertNotEquals($etagBefore, $response->getHeaderLine('ETag'), 'ETag bumped on archive');

		// unarchive removes the flag
		$rn = $this->updateNote($note, (object)[ 'archived' => false ], (object)[ 'archived' => false ]);
		$this->assertFalse($rn->archived, 'Note unarchived');

		$this->http->request('DELETE', 'notes/' . $note->id);
	}

	/** @depends testCheckForReferenceNotes */
	public function testExcerpt() : void {
		$note = $this->createNote((object)[
			'category' => '',
			'title' => 'Excerpt note',
			'content' => '# Excerpt note' . PHP_EOL . 'first body line' . PHP_EOL . 'second body line',
		], (object)[]);
		$this->assertObjectHasProperty('excerpt', $note, 'Note carries an excerpt');
		$this->assertStringContainsString('first body line', $note->excerpt, 'Excerpt is the body preview');

		// the list carries the excerpt even when content is excluded from the payload
		$response = $this->http->request('GET', 'notes?exclude=content');
		$this->checkResponse($response, 'List notes without content', 200);
		$listed = null;
		foreach (json_decode($response->getBody()->getContents()) as $n) {
			if ($n->id === $note->id) {
				$listed = $n;
			}
		}
		$this->assertNotNull($listed, 'Created note is in the list');
		$this->assertStringContainsString('first body line', $listed->excerpt, 'List excerpt present');
		$this->assertFalse(isset($listed->content), 'Content excluded from the list');

		// editing the body changes the excerpt on refetch
		$this->updateNote($note, (object)[ 'content' => '# Excerpt note' . PHP_EOL . 'rewritten body' ], (object)[]);
		$response = $this->http->request('GET', 'notes/' . $note->id);
		$refetched = json_decode($response->getBody()->getContents());
		$this->assertStringContainsString('rewritten body', $refetched->excerpt, 'Excerpt tracks content edits');

		$this->http->request('DELETE', 'notes/' . $note->id);
	}

	/**
	 * @depends testCheckForReferenceNotes
	 * @depends testCreateNotes
	 */
	public function testGetNotesWithCategory(array $refNotes, array $testNotes) : void {
		if ($this->getAPIMajorVersion() < 1) {
			$this->markTestSkipped('Get Notes with Category requires API v1');
		}
		$allNotes = array_merge($refNotes, $testNotes);
		$this->checkGetReferenceNotes($allNotes, 'Pre-condition');
		$note = $testNotes[0];
		$category = $note->category;
		$filteredNotes = array_filter(
			$allNotes,
			function ($note) use ($category) {
				return $category === $note->category;
			}
		);
		$this->assertNotEmpty($filteredNotes, 'Filtered notes');
		$this->checkGetReferenceNotes(
			$filteredNotes,
			'Get notes with category ' . $category,
			'?category=' . urlencode($category)
		);
	}

	protected function checkGetChunkNotes(
		array $indexedRefNotes,
		int $chunkSize,
		string $messagePrefix,
		?string $chunkCursor = null,
		array $collectedNotes = [],
	) : array {
		$requestCount = 0;
		$previousChunkCursor = null;
		do {
			$requestCount++;
			$previousChunkCursor = $chunkCursor;
			$query = '?chunkSize=' . $chunkSize;
			if ($chunkCursor) {
				$query .= '&chunkCursor=' . $chunkCursor;
			}
			$response = $this->http->request('GET', 'notes' . $query);
			$chunkCursor = $response->getHeaderLine('X-Notes-Chunk-Cursor');
			$this->checkResponse($response, $messagePrefix . 'Check response ' . $requestCount, 200);
			$notes = json_decode($response->getBody()->getContents());
			if ($chunkCursor) {
				$this->assertIsArray($notes, $messagePrefix . 'Response ' . $requestCount);
				$this->assertLessThanOrEqual(
					$chunkSize,
					count($notes),
					$messagePrefix . 'Notes of response ' . $requestCount
				);
				foreach ($notes as $note) {
					$this->assertArrayNotHasKey(
						$note->id,
						$collectedNotes,
						$messagePrefix . 'Note ID of response ' . $requestCount . ' in collectedNotes'
					);
					$this->assertArrayHasKey(
						$note->id,
						$indexedRefNotes,
						$messagePrefix . 'Note ID of response ' . $requestCount . ' in refNotes'
					);
					$this->checkReferenceNote(
						$indexedRefNotes[$note->id],
						$note,
						$messagePrefix . 'Note in response ' . $requestCount
					);
					$collectedNotes[$note->id] = $note;
				}
			} else {
				$leftIds = array_diff(array_keys($indexedRefNotes), array_keys($collectedNotes));
				$this->checkReferenceNotes(
					$indexedRefNotes,
					$notes,
					$messagePrefix . 'Notes of response ' . $requestCount,
					[],
					$leftIds
				);
			}
		} while ($chunkCursor && $requestCount < 100);
		$this->assertEmpty($chunkCursor, $messagePrefix . 'Last response Chunk Cursor');
		return [
			'previousChunkCursor' => $previousChunkCursor,
			'collectedNotes' => $collectedNotes,
		];
	}

	/**
	 * @depends testCheckForReferenceNotes
	 * @depends testCreateNotes
	 */
	public function testGetChunkedNotes(array $refNotes, array $testNotes) : void {
		sleep(1); // wait for 'Last-Modified' to be >= Last-change + 1
		$indexedRefNotes = $this->getNotesIdMap(array_merge($refNotes, $testNotes), 'RefNotes');
		$l = $this->checkGetChunkNotes($indexedRefNotes, 2, 'Test1: ');

		$note = $testNotes[0];
		$rn1 = $this->updateNote($note, (object)[
			'category' => 'ChunkedNote',
		], (object)[]);

		$collectedNotes = $l['collectedNotes'];
		$this->assertArrayHasKey($note->id, $collectedNotes, 'Updated note is not in last chunk.');
		unset($collectedNotes[$note->id]);
		$this->checkGetChunkNotes($indexedRefNotes, 2, 'Test2: ', $l['previousChunkCursor'], $collectedNotes);
	}

	public function testGetSettings() : \stdClass {
		$response = $this->http->request('GET', 'settings');
		$this->checkResponse($response, 'Get settings', 200);
		$settings = json_decode($response->getBody()->getContents());
		foreach ($this->requiredSettings as $key => $type) {
			$this->assertObjectHasAttribute($key, $settings, 'Settings has property ' . $key);
			$this->assertEquals($type, gettype($settings->$key), 'Property type of ' . $key);
		}
		return $settings;
	}

	/**
	 * @depends testCheckForReferenceNotes
	 * @depends testGetSettings
	 */
	public function testSettings(array $refNotes, \stdClass $settings) : void {
		$this->checkGetReferenceNotes($refNotes, 'Pre-condition');
		$originalPath = $settings->notesPath;
		$this->updateSettings($settings, (object)[
			'notesPath' => 'New-Test-Notes-Folder1',
			'fileSuffix' => '.md',
		], (object)[], 'Update both settings');
		$this->checkGetReferenceNotes([], 'Notes are gone after changing notes path');
		$this->updateSettings($settings, (object)[
			'notesPath' => '../../Test/./../New-Test-Notes-Folder2',
		], (object)[
			'notesPath' => 'New-Test-Notes-Folder2',
		], 'Update notesPath with path traversal check');
		$this->updateSettings($settings, (object)[
			'notesPath' => '',
		], (object)[], 'Update notesPath with root directory');
		$this->updateSettings($settings, (object)[
			'fileSuffix' => '.customextension',
		], (object)[], 'Update fileSuffix with custom value');
		$this->updateSettings($settings, (object)[
			'fileSuffix' => 'illegal value',
		], (object)[
			'fileSuffix' => '.illegalvalue',
		], 'Update fileSuffix with illegal value');
		$this->updateSettings($settings, (object)[
			'fileSuffix' => '',
		], (object)[
			'fileSuffix' => '.md',
		], 'Update fileSuffix with empty value');
		$this->updateSettings($settings, (object)[
			'notesPath' => null,
			'fileSuffix' => null,
		], (object)[
			'notesPath' => 'Notes',
			'fileSuffix' => '.md',
		], 'Update settings with default values');
		$this->updateSettings($settings, (object)[
			'notesPath' => $originalPath,
		], (object)[], 'Update notesPath to original value');
		$this->checkGetReferenceNotes($refNotes, 'Post-condition');
	}
}
