<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2020 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\NotesPlus\Service;

use OCP\Files\File;
use OCP\Files\Folder;

class Note {
	private File $file;
	private Folder $notesFolder;
	private NoteUtil $noteUtil;
	private Util $util;
	private FrontMatter $frontMatter;
	/** in-request cache of the raw file content, refreshed on every write */
	private ?string $rawContent = null;

	public function __construct(File $file, Folder $notesFolder, NoteUtil $noteUtil) {
		$this->file = $file;
		$this->notesFolder = $notesFolder;
		$this->noteUtil = $noteUtil;
		$this->util = $noteUtil->util;
		$this->frontMatter = new FrontMatter();
	}

	public function getId() : int {
		return $this->file->getId();
	}

	public function getTitle() : string {
		return pathinfo($this->file->getName(), PATHINFO_FILENAME);
	}

	public function getCategory() : string {
		$subdir = substr(
			dirname($this->file->getPath()),
			strlen($this->notesFolder->getPath()) + 1
		);
		return $subdir === false ? '' : $subdir;
	}

	/**
	 * Raw, encoding-sanitized file content INCLUDING any front-matter fence.
	 * Use getContent() for the editor-facing body; use this only when the
	 * front-matter itself must be read or rewritten (ADR-007).
	 */
	private function getRawContent() : string {
		if ($this->rawContent !== null) {
			return $this->rawContent;
		}
		$content = $this->file->getContent();
		// blank files return false when using object storage as primary storage
		if ($content === false && $this->file->getSize() === 0) {
			$content = '';
		}
		if (!is_string($content)) {
			throw new \Exception('Can\'t read file content for ' . $this->file->getPath());
		}
		if (!mb_check_encoding($content, 'UTF-8')) {
			$this->util->logger->warning(
				'File encoding for ' . $this->file->getPath() . ' is not UTF-8. This may cause problems.'
			);
			$content = mb_convert_encoding($content, 'UTF-8');
		}
		$content = str_replace([ pack('H*', 'FEFF'), pack('H*', 'FFEF'), pack('H*', 'EFBBBF') ], '', $content);
		$this->rawContent = $content;
		return $content;
	}

	/**
	 * Persist raw file content and keep the in-request cache in sync, so a
	 * subsequent read in the same request does not re-hit storage.
	 */
	private function writeRawContent(string $raw) : void {
		$this->noteUtil->ensureSufficientStorage($this->file->getParent(), strlen($raw));
		$this->file->putContent($raw);
		$this->rawContent = $raw;
	}

	/**
	 * Validate/normalize a color to `#rrggbb` (lower-case) or null (cleared).
	 * The file is the source of truth (ADR-007), so any 6-digit hex is allowed
	 * — not just the UI palette — but arbitrary strings are rejected to keep the
	 * value safe as a CSS custom property and clean in the note file.
	 *
	 * @throws \InvalidArgumentException on a non-empty, non-hex value
	 */
	private function normalizeColorValue(?string $color) : ?string {
		if ($color === null || $color === '') {
			return null;
		}
		$color = strtolower($color);
		if (preg_match('/^#[0-9a-f]{6}$/', $color) !== 1) {
			throw new \InvalidArgumentException('Invalid note color: ' . $color);
		}
		return $color;
	}

	public function getContent() : string {
		return $this->frontMatter->parse($this->getRawContent())['body'];
	}

	public function getColor() : ?string {
		$attrs = $this->frontMatter->parse($this->getRawContent())['attrs'];
		return $attrs['color'] ?? null;
	}

	public function getArchived() : bool {
		$attrs = $this->frontMatter->parse($this->getRawContent())['attrs'];
		// FrontMatter is a string-only layer; archived is the literal sentinel
		// 'true' in the fence, absence means not archived (see E03 PLAN).
		return ($attrs['archived'] ?? null) === 'true';
	}

	public function getExcerpt(int $maxlen = 100) : string {
		$excerpt = trim($this->noteUtil->stripMarkdown($this->getContent()));
		$title = $this->getTitle();
		if (!empty($title)) {
			$length = mb_strlen($title, 'utf-8');
			if (strncasecmp($excerpt, $title, $length) === 0) {
				$excerpt = mb_substr($excerpt, $length, null, 'utf-8');
			}
		}
		$excerpt = trim($excerpt);
		if (mb_strlen($excerpt, 'utf-8') > $maxlen) {
			$excerpt = mb_substr($excerpt, 0, $maxlen, 'utf-8') . '…';
		}
		return str_replace("\n", "\u{2003}", $excerpt);
	}

	public function getModified() : int {
		return $this->file->getMTime();
	}

	public function getFavorite() : bool {
		return $this->noteUtil->getTagService()->isFavorite($this->getId());
	}

	public function getReadOnly() : bool {
		return !$this->file->isUpdateable();
	}

	public function getData(array $exclude = []) : array {
		$data = [];
		if (!in_array('id', $exclude)) {
			$data['id'] = $this->getId();
		}
		if (!in_array('title', $exclude)) {
			$data['title'] = $this->getTitle();
		}
		if (!in_array('modified', $exclude)) {
			$data['modified'] = $this->getModified();
		}
		if (!in_array('category', $exclude)) {
			$data['category'] = $this->getCategory();
		}
		if (!in_array('favorite', $exclude)) {
			$data['favorite'] = $this->getFavorite();
		}
		if (!in_array('color', $exclude)) {
			$data['color'] = $this->getColor();
		}
		if (!in_array('archived', $exclude)) {
			$data['archived'] = $this->getArchived();
		}
		if (!in_array('readonly', $exclude)) {
			$data['readonly'] = $this->getReadOnly();
		}
		$data['internalPath'] = $this->noteUtil->getPathForUser($this->file);
		$data['shareTypes'] = $this->noteUtil->getShareTypes($this->file);
		$data['isShared'] = (bool)count($data['shareTypes']);
		$data['error'] = false;
		$data['errorType'] = '';
		if (!in_array('content', $exclude)) {
			try {
				$data['content'] = $this->getContent();
			} catch (\Throwable $e) {
				$this->util->logger->error(
					'Could not read content for file: ' . $this->file->getPath(),
					[ 'exception' => $e ]
				);
				$message = $this->util->l10n->t('Error') . ': ' . get_class($e);
				$data['content'] = $message;
				$data['error'] = true;
				$data['errorType'] = get_class($e);
				$data['readonly'] = true;
			}
		}
		return $data;
	}

	public function getFileEtag() : string {
		return $this->file->getEtag();
	}

	public function setTitle(string $title) : void {
		$this->noteUtil->ensureNoteIsWritable($this->file);
		$this->setTitleCategory($title);
	}

	public function setCategory(string $category) : void {
		$this->noteUtil->ensureNoteIsWritable($this->file);
		$this->setTitleCategory($this->getTitle(), $category);
	}

	/**
	 * @throws \OCP\Files\NotPermittedException
	 */
	public function setTitleCategory(string $title, ?string $category = null) : void {
		$this->noteUtil->ensureNoteIsWritable($this->file);
		if ($category === null) {
			$category = $this->getCategory();
		}
		$oldParent = $this->file->getParent();
		$currentFilePath = $this->noteUtil->getRoot()->getFullPath($this->file->getPath());
		$fileSuffix = '.' . pathinfo($this->file->getName(), PATHINFO_EXTENSION);

		$folder = $this->noteUtil->getCategoryFolder($this->notesFolder, $category);
		$filename = $this->noteUtil->generateFileName($folder, $title, $fileSuffix, $this->getId());
		$newFilePath = $folder->getPath() . '/' . $filename;

		// if the current path is not the new path, the file has to be renamed
		if ($currentFilePath !== $newFilePath) {
			$this->file->move($newFilePath);
		}
		$this->noteUtil->deleteEmptyFolder($oldParent, $this->notesFolder);
	}

	public function setContent(string $content) : void {
		$this->noteUtil->ensureNoteIsWritable($this->file);
		// preserve any front-matter we own (color, later tags) when the editor
		// saves the body — the client never sees or sends the fence (ADR-007)
		$attrs = $this->frontMatter->parse($this->getRawContent())['attrs'];
		$this->writeRawContent($this->frontMatter->serialize($attrs, $content));
	}

	public function setColor(?string $color) : void {
		$color = $this->normalizeColorValue($color);
		if ($color === $this->getColor()) {
			return;
		}
		$this->noteUtil->ensureNoteIsWritable($this->file);
		$parsed = $this->frontMatter->parse($this->getRawContent());
		$attrs = $parsed['attrs'];
		if ($color === null) {
			unset($attrs['color']);
		} else {
			$attrs['color'] = $color;
		}
		$this->writeRawContent($this->frontMatter->serialize($attrs, $parsed['body']));
	}

	public function setArchived(bool $archived) : void {
		if ($archived === $this->getArchived()) {
			return;
		}
		$this->noteUtil->ensureNoteIsWritable($this->file);
		$parsed = $this->frontMatter->parse($this->getRawContent());
		$attrs = $parsed['attrs'];
		if ($archived) {
			$attrs['archived'] = 'true';
		} else {
			unset($attrs['archived']);
		}
		$this->writeRawContent($this->frontMatter->serialize($attrs, $parsed['body']));
	}

	public function setModified(int $modified) : void {
		$this->noteUtil->ensureNoteIsWritable($this->file);
		$this->file->touch($modified);
	}

	public function setFavorite(bool $favorite) : void {
		if ($favorite !== $this->getFavorite()) {
			$this->noteUtil->getTagService()->setFavorite($this->getId(), $favorite);
		}
	}

	public function getFile(): File {
		return $this->file;
	}
}
