<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Paweł Żentała and Notes+ contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\NotesPlus\Tests\Unit\Service;

use OCA\NotesPlus\Service\FrontMatter;
use PHPUnit\Framework\TestCase;

class FrontMatterTest extends TestCase {
	private FrontMatter $fm;

	protected function setUp() : void {
		$this->fm = new FrontMatter();
	}

	public function testPlainBodyHasNoAttrs() : void {
		$raw = "# Title\n\nsome body\n";
		$parsed = $this->fm->parse($raw);
		$this->assertSame([], $parsed['attrs']);
		$this->assertSame($raw, $parsed['body']);
	}

	public function testParsesColorAttrAndStripsFence() : void {
		$raw = "---\ncolor: '#f28b82'\n---\n# Title\nbody\n";
		$parsed = $this->fm->parse($raw);
		$this->assertSame(['color' => '#f28b82'], $parsed['attrs']);
		$this->assertSame("# Title\nbody\n", $parsed['body']);
	}

	public function testSerializeEmptyAttrsLeavesBodyByteIdentical() : void {
		$body = "just a note\n";
		$this->assertSame($body, $this->fm->serialize([], $body));
		$this->assertSame($body, $this->fm->serialize(['color' => null], $body));
		$this->assertSame($body, $this->fm->serialize(['color' => ''], $body));
	}

	public function testRoundTrip() : void {
		$attrs = ['color' => '#ccff90'];
		$body = "# Note\n\n- [ ] task\n";
		$raw = $this->fm->serialize($attrs, $body);
		$parsed = $this->fm->parse($raw);
		$this->assertSame($attrs, $parsed['attrs']);
		$this->assertSame($body, $parsed['body']);
	}

	public function testBailsWhenHeaderLineHasNoColon() : void {
		// a thematic break followed by prose, not a key: value block
		$raw = "---\nnot a header\n---\nbody\n";
		$parsed = $this->fm->parse($raw);
		$this->assertSame([], $parsed['attrs']);
		$this->assertSame($raw, $parsed['body']);
	}

	public function testBailsOnMissingClosingFence() : void {
		$raw = "---\ncolor: '#fff475'\nbody without close\n";
		$parsed = $this->fm->parse($raw);
		$this->assertSame([], $parsed['attrs']);
		$this->assertSame($raw, $parsed['body']);
	}

	public function testBodyStartingWithFenceSurvivesRoundTrip() : void {
		$body = "---\nan hr then text\n";
		$raw = $this->fm->serialize(['color' => '#a7ffeb'], $body);
		$parsed = $this->fm->parse($raw);
		$this->assertSame(['color' => '#a7ffeb'], $parsed['attrs']);
		$this->assertSame($body, $parsed['body']);
	}

	public function testApostropheValueRoundTrips() : void {
		// relevant for E05 free-text tags reusing this helper
		$attrs = ['tag' => "a'b"];
		$raw = $this->fm->serialize($attrs, "body\n");
		$this->assertStringContainsString("tag: 'a''b'", $raw);
		$this->assertSame($attrs, $this->fm->parse($raw)['attrs']);
	}

	public function testHexValueIsQuotedAndReadBack() : void {
		$raw = $this->fm->serialize(['color' => '#f28b82'], "body\n");
		// leading '#' would be a YAML comment unquoted, so it must be quoted
		$this->assertStringContainsString("color: '#f28b82'", $raw);
		$this->assertSame('#f28b82', $this->fm->parse($raw)['attrs']['color']);
	}

	public function testUnknownAttrsPreserved() : void {
		$raw = "---\ncolor: '#e8eaed'\nsource_id: keep-123\n---\nbody\n";
		$parsed = $this->fm->parse($raw);
		$this->assertSame('#e8eaed', $parsed['attrs']['color']);
		$this->assertSame('keep-123', $parsed['attrs']['source_id']);
	}

	public function testCrlfLineEndings() : void {
		$raw = "---\r\ncolor: '#fdcfe8'\r\n---\r\nbody line\r\n";
		$parsed = $this->fm->parse($raw);
		$this->assertSame(['color' => '#fdcfe8'], $parsed['attrs']);
		$this->assertSame("body line\n", $parsed['body']);
	}
}
