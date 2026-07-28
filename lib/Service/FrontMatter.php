<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Paweł Żentała and Notes+ contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\NotesPlus\Service;

/**
 * Minimal YAML-ish front-matter layer for Notes+ (ADR-007).
 *
 * We deliberately do NOT pull in a full YAML parser: notes are user files, and
 * we only ever own a handful of flat `key: value` attributes (color now, tags
 * later). Recognition is conservative — a block is front-matter only when the
 * content starts with a `---` fence line and has a matching closing `---`.
 * Anything else is treated as pure body, so a note that merely happens to
 * contain `---` somewhere is never altered.
 */
class FrontMatter {
	private const FENCE = '---';

	/**
	 * Split raw file content into [attrs, body].
	 *
	 * @return array{attrs: array<string,string>, body: string}
	 */
	public function parse(string $raw) : array {
		$lines = preg_split('/\r\n|\r|\n/', $raw);
		if ($lines === false || count($lines) < 2 || trim($lines[0]) !== self::FENCE) {
			return ['attrs' => [], 'body' => $raw];
		}
		// find the closing fence
		$close = -1;
		for ($i = 1; $i < count($lines); $i++) {
			if (trim($lines[$i]) === self::FENCE) {
				$close = $i;
				break;
			}
		}
		if ($close === -1) {
			return ['attrs' => [], 'body' => $raw];
		}
		$attrs = [];
		for ($i = 1; $i < $close; $i++) {
			$line = $lines[$i];
			if (trim($line) === '') {
				continue;
			}
			$pos = strpos($line, ':');
			if ($pos === false) {
				// not a simple key: value block — bail out, treat all as body
				return ['attrs' => [], 'body' => $raw];
			}
			$key = trim(substr($line, 0, $pos));
			$value = $this->unquote(trim(substr($line, $pos + 1)));
			if ($key !== '') {
				$attrs[$key] = $value;
			}
		}
		$body = implode("\n", array_slice($lines, $close + 1));
		return ['attrs' => $attrs, 'body' => $body];
	}

	/**
	 * Re-emit raw file content from attrs + body. With no attrs, the body is
	 * returned untouched (no fence) so notes we do not own stay byte-identical.
	 *
	 * @param array<string,string> $attrs
	 */
	public function serialize(array $attrs, string $body) : string {
		$attrs = array_filter($attrs, fn ($v) => $v !== null && $v !== '');
		if (count($attrs) === 0) {
			return $body;
		}
		$out = self::FENCE . "\n";
		foreach ($attrs as $key => $value) {
			$out .= $key . ': ' . $this->quote((string)$value) . "\n";
		}
		$out .= self::FENCE . "\n";
		return $out . $body;
	}

	private function unquote(string $value) : string {
		$len = strlen($value);
		if ($len >= 2) {
			$first = $value[0];
			if (($first === '"' || $first === '\'') && $value[$len - 1] === $first) {
				return substr($value, 1, $len - 2);
			}
		}
		return $value;
	}

	private function quote(string $value) : string {
		// single-quote values that could be misread (leading #, colons, etc.)
		if (preg_match('/^[A-Za-z0-9._\/-]+$/', $value) === 1) {
			return $value;
		}
		return '\'' . str_replace('\'', '\'\'', $value) . '\'';
	}
}
