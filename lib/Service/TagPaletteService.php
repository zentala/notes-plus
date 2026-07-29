<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Paweł Żentała and Notes+ contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\NotesPlus\Service;

use OCA\NotesPlus\AppInfo\Application;
use OCP\IConfig;

/**
 * Per-user tag palette: a name → colour map (ADR-008). Tag membership lives in
 * each note's front-matter; only the colour of a tag is global to the user, so
 * we keep it in a single JSON blob in `oc_preferences` — the same storage the
 * `SettingsService` uses, no DB table.
 *
 * Keys are the tag display names as written on notes; lookups are
 * case-insensitive so `Work` and `work` share one colour.
 */
class TagPaletteService {
	private const CONFIG_KEY = 'tag_colors';

	public function __construct(private IConfig $config) {
	}

	/**
	 * The full palette as a name → `#rrggbb` map (only tags that have a colour).
	 *
	 * @return array<string,string>
	 */
	public function getAll(string $userId) : array {
		$raw = $this->config->getUserValue($userId, Application::APP_ID, self::CONFIG_KEY, '');
		if ($raw === '') {
			return [];
		}
		$decoded = json_decode($raw, true);
		return is_array($decoded) ? $decoded : [];
	}

	/**
	 * Set (or clear, with a null/empty colour) the colour of a tag.
	 *
	 * @throws \InvalidArgumentException on a non-hex colour
	 * @return array<string,string> the updated palette
	 */
	public function setColor(string $userId, string $name, ?string $color) : array {
		$name = trim($name);
		if ($name === '') {
			throw new \InvalidArgumentException('Empty tag name');
		}
		$palette = $this->getAll($userId);
		$existingKey = $this->findKey($palette, $name) ?? $name;
		$color = $this->normalizeColor($color);
		if ($color === null) {
			unset($palette[$existingKey]);
		} else {
			$palette[$existingKey] = $color;
		}
		$this->save($userId, $palette);
		return $palette;
	}

	/**
	 * Move a colour entry from one tag name to another (used when a tag is
	 * renamed). Reconciling the notes themselves is the caller's job.
	 *
	 * @return array<string,string> the updated palette
	 */
	public function rename(string $userId, string $oldName, string $newName) : array {
		$palette = $this->getAll($userId);
		$oldKey = $this->findKey($palette, trim($oldName));
		if ($oldKey !== null) {
			$color = $palette[$oldKey];
			unset($palette[$oldKey]);
			$newKey = $this->findKey($palette, trim($newName)) ?? trim($newName);
			$palette[$newKey] = $color;
			$this->save($userId, $palette);
		}
		return $palette;
	}

	/**
	 * @return array<string,string> the updated palette
	 */
	public function delete(string $userId, string $name) : array {
		$palette = $this->getAll($userId);
		$key = $this->findKey($palette, trim($name));
		if ($key !== null) {
			unset($palette[$key]);
			$this->save($userId, $palette);
		}
		return $palette;
	}

	/** Case-insensitive key lookup. */
	private function findKey(array $palette, string $name) : ?string {
		$needle = mb_strtolower($name, 'UTF-8');
		foreach (array_keys($palette) as $key) {
			if (mb_strtolower((string)$key, 'UTF-8') === $needle) {
				return (string)$key;
			}
		}
		return null;
	}

	/** @throws \InvalidArgumentException */
	private function normalizeColor(?string $color) : ?string {
		if ($color === null || $color === '') {
			return null;
		}
		$color = strtolower($color);
		if (preg_match('/^#[0-9a-f]{6}$/', $color) !== 1) {
			throw new \InvalidArgumentException('Invalid tag color: ' . $color);
		}
		return $color;
	}

	/** @param array<string,string> $palette */
	private function save(string $userId, array $palette) : void {
		$this->config->setUserValue($userId, Application::APP_ID, self::CONFIG_KEY, json_encode($palette));
	}
}
