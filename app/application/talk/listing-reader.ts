import type { TalkGalleryItem } from "../../domain/talk/types";
import {
	buildTalkListingPage,
	normalizeTalkListingRequest,
	type TalkListingPage,
	type TalkListingRequest,
} from "./listing";
import {
	normalizeSearchFields,
	tokenizeSearchQuery,
	type SearchField,
	type TranscriptSearchSnippet,
} from "./search";

export const TALK_SEARCH_MATCH_CACHE_TTL_MS = 5 * 60 * 1000;
export const TALK_SEARCH_MATCH_CACHE_MAX_ENTRIES = 100;

export type TalkListingDependencies = {
	loadItems: () => Promise<TalkGalleryItem[]>;
	findMatchingTalkIds: (
		query: string,
		searchFields: readonly SearchField[],
	) => Promise<readonly string[]>;
	buildTranscriptSnippets: (
		query: string,
		talkIds: readonly string[],
		searchFields: readonly SearchField[],
	) => Promise<ReadonlyMap<string, TranscriptSearchSnippet[]>>;
};

export type TalkListingReaderOptions = {
	now?: () => number;
	searchCacheTtlMs?: number;
	maxSearchCacheEntries?: number;
};

export function createTalkListingReader(
	dependencies: TalkListingDependencies,
	options: TalkListingReaderOptions = {},
) {
	const now = options.now ?? Date.now;
	const ttl = options.searchCacheTtlMs ?? TALK_SEARCH_MATCH_CACHE_TTL_MS;
	const maxEntries =
		options.maxSearchCacheEntries ?? TALK_SEARCH_MATCH_CACHE_MAX_ENTRIES;
	const cache = new Map<string, { expiresAt: number; talkIds: string[] }>();
	const inFlight = new Map<string, Promise<string[]>>();

	async function readMatchingIds(
		query: string,
		searchFields: readonly SearchField[],
	) {
		const tokens = tokenizeSearchQuery(query);
		if (tokens.length === 0) return [];
		const normalizedSearchFields = normalizeSearchFields(searchFields);
		const key = [
			normalizedSearchFields.join("\u0000"),
			tokens.join("\u0000"),
		].join("\u0001");
		const cached = cache.get(key);
		if (cached && cached.expiresAt > now()) return cached.talkIds;
		if (cached) cache.delete(key);
		const pending = inFlight.get(key);
		if (pending) return pending;

		const loadPromise = (async () => {
			const talkIds = [
				...(await dependencies.findMatchingTalkIds(
					tokens.join(" "),
					normalizedSearchFields,
				)),
			];
			if (cache.size >= maxEntries) {
				const oldestKey = cache.keys().next().value;
				if (oldestKey !== undefined) cache.delete(oldestKey);
			}
			cache.set(key, { expiresAt: now() + ttl, talkIds });
			return talkIds;
		})();
		inFlight.set(key, loadPromise);
		try {
			return await loadPromise;
		} finally {
			if (inFlight.get(key) === loadPromise) {
				inFlight.delete(key);
			}
		}
	}

	return async function readTalkListingPage(
		request: TalkListingRequest,
	): Promise<TalkListingPage | null> {
		const items = await dependencies.loadItems();
		const normalized = normalizeTalkListingRequest(items, request);
		if (!normalized) return null;

		const matchedTalkIds = normalized.conditions.query
			? await readMatchingIds(
					normalized.conditions.query,
					normalized.conditions.searchFields,
				)
			: [];
		const page = buildTalkListingPage(items, normalized, matchedTalkIds);
		if (!page || !normalized.conditions.query || page.items.length === 0) {
			return page;
		}

		const visibleIds = page.items.map((item) => item.id);
		const snippets = await dependencies.buildTranscriptSnippets(
			tokenizeSearchQuery(normalized.conditions.query).join(" "),
			visibleIds,
			normalized.conditions.searchFields,
		);
		return buildTalkListingPage(items, normalized, matchedTalkIds, snippets);
	};
}
