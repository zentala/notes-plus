<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Paweł Żentała and Notes+ contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\NotesPlus\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\JSONResponse;
use OCP\Collaboration\Reference\IReferenceManager;
use OCP\IRequest;

/**
 * Resolve a URL found in a note into an OpenGraph preview (E07). We reuse
 * Nextcloud's core reference system (`IReferenceManager`) — the same mechanism
 * the Text app uses — so fetching, sanitising and caching are handled by core;
 * we never fetch remote content ourselves. A URL that resolves to nothing rich
 * returns 204 so the client simply shows no card.
 */
class LinkPreviewController extends Controller {
	public function __construct(
		string $AppName,
		IRequest $request,
		private IReferenceManager $referenceManager,
		private Helper $helper,
	) {
		parent::__construct($AppName, $request);
	}

	#[NoAdminRequired]
	public function preview(string $url) : JSONResponse {
		return $this->helper->handleErrorResponse(function () use ($url) {
			$url = trim($url);
			if ($url === '' || !preg_match('#^https?://#i', $url)) {
				return new JSONResponse([], Http::STATUS_BAD_REQUEST);
			}
			$reference = $this->referenceManager->resolveReference($url);
			if ($reference === null) {
				return new JSONResponse([], Http::STATUS_NO_CONTENT);
			}
			$og = $reference->getOpenGraphObject();
			$title = $reference->getTitle() ?: ($og['name'] ?? '');
			$description = $reference->getDescription() ?? ($og['description'] ?? '');
			$imageUrl = $reference->getImageUrl() ?: ($og['thumb'] ?? null);
			if ($title === '' && $description === '' && !$imageUrl) {
				return new JSONResponse([], Http::STATUS_NO_CONTENT);
			}
			return [
				'url' => $reference->getUrl() ?: $url,
				'title' => $title,
				'description' => $description,
				'imageUrl' => $imageUrl,
			];
		});
	}
}
