<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Paweł Żentała and Notes+ contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\NotesPlus\Controller;

use OCA\NotesPlus\Service\NotesService;
use OCA\NotesPlus\Service\TagPaletteService;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\JSONResponse;
use OCP\IRequest;

/**
 * Tag palette + reconciliation endpoints (ADR-008). The palette (tag → colour)
 * is per-user global; membership lives in each note's front-matter, so rename
 * and delete rewrite the affected note files as well as the palette.
 */
class TagsController extends Controller {
	public function __construct(
		string $AppName,
		IRequest $request,
		private NotesService $notesService,
		private TagPaletteService $palette,
		private Helper $helper,
	) {
		parent::__construct($AppName, $request);
	}

	/** The per-user palette as a name → colour map. */
	#[NoAdminRequired]
	public function index() : JSONResponse {
		return $this->helper->handleErrorResponse(function () {
			return $this->palette->getAll($this->helper->getUID());
		});
	}

	/** Set (empty colour clears) the colour of a tag. */
	#[NoAdminRequired]
	public function setColor(string $name, ?string $color = null) : JSONResponse {
		return $this->helper->handleErrorResponse(function () use ($name, $color) {
			return $this->palette->setColor($this->helper->getUID(), $name, $color ?: null);
		});
	}

	/** Rename a tag everywhere: palette entry + every note carrying it. */
	#[NoAdminRequired]
	public function rename(string $oldName, string $newName) : JSONResponse {
		return $this->helper->handleErrorResponse(function () use ($oldName, $newName) {
			$userId = $this->helper->getUID();
			$this->reconcile($userId, function (array $tags) use ($oldName, $newName) {
				return array_map(
					fn ($tag) => $this->same($tag, $oldName) ? $newName : $tag,
					$tags
				);
			});
			return $this->palette->rename($userId, $oldName, $newName);
		});
	}

	/** Remove a tag from the palette and strip it from every note. */
	#[NoAdminRequired]
	public function destroy(string $name) : JSONResponse {
		return $this->helper->handleErrorResponse(function () use ($name) {
			$userId = $this->helper->getUID();
			$this->reconcile($userId, function (array $tags) use ($name) {
				return array_values(array_filter($tags, fn ($tag) => !$this->same($tag, $name)));
			});
			return $this->palette->delete($userId, $name);
		});
	}

	/**
	 * Apply a tag-list transform to every note whose tags actually change.
	 *
	 * @param callable(string[]):string[] $transform
	 */
	private function reconcile(string $userId, callable $transform) : void {
		$data = $this->notesService->getAll($userId, false);
		foreach ($data['notes'] as $note) {
			$tags = $note->getTags();
			$updated = $transform($tags);
			if (array_values($updated) !== array_values($tags)) {
				$note->setTags($updated);
			}
		}
	}

	private function same(string $a, string $b) : bool {
		return mb_strtolower(trim($a), 'UTF-8') === mb_strtolower(trim($b), 'UTF-8');
	}
}
