import type { ContentItemBase } from "../../domain/content/types";
import type { TalkForDisplay } from "../../domain/talk/types";
import type { TranscriptCue } from "../../domain/transcript/types";

export type ContentSearchItem = ContentItemBase & {
	subtitle?: string;
	dvdId?: string;
	event?: string;
	venue?: string;
	speaker?: string;
	language?: string;
	recordedOnFormatted?: string;
	recordedOnRaw?: string;
	decadeLabel?: string;
	themeLabel?: string;
};

export const SEARCH_FIELD_OPTIONS = [
	{ id: "title", label: "タイトル" },
	{ id: "description", label: "解説" },
	{ id: "transcript", label: "文字起こし" },
] as const;

export type SearchField = (typeof SEARCH_FIELD_OPTIONS)[number]["id"];

type SearchTextByField = {
	title: string;
	description: string;
	transcript: string;
};

export const ALL_SEARCH_FIELDS: readonly SearchField[] =
	SEARCH_FIELD_OPTIONS.map(({ id }) => id);

export function normalizeSearchFields(
	fields?: readonly string[],
): SearchField[] {
	if (!fields || fields.length === 0 || fields.includes("all")) {
		return [...ALL_SEARCH_FIELDS];
	}

	const validFields = fields.filter((field): field is SearchField =>
		SEARCH_FIELD_OPTIONS.some(({ id }) => id === field),
	);
	return validFields.length > 0
		? [...new Set(validFields)]
		: [...ALL_SEARCH_FIELDS];
}

export function areAllSearchFieldsSelected(
	fields?: readonly string[],
): boolean {
	return normalizeSearchFields(fields).length === ALL_SEARCH_FIELDS.length;
}

export type IndexedContentItem<TItem extends ContentSearchItem> = {
	data: TItem;
	searchText: string;
	searchTextByField: SearchTextByField;
};

export type IndexedTalk = IndexedContentItem<TalkForDisplay>;

export type BuildSearchIndexOptions = {
	extraSearchTextByTalkId?: ReadonlyMap<string, string>;
};

type Range = {
	start: number;
	end: number;
};

type NormalizedSlice = {
	originalStart: number;
	originalEnd: number;
	normalizedStart: number;
	normalizedEnd: number;
	normalized: string;
};

type SearchSnippetOptions = {
	contextLength?: number;
	maxSnippets?: number;
};

export type TranscriptSearchSnippet = {
	text: string;
	cueIndex: number;
	start: number;
	startLabel: string;
};

const DEFAULT_SNIPPET_CONTEXT_LENGTH = 42;
const DEFAULT_MAX_SNIPPETS = 2;

export function normalizeForSearch(value: string): string {
	return value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeSearchParts(values: (string | undefined)[]): string {
	return normalizeForSearch(values.filter(Boolean).join(" "));
}

function buildSearchTextByField(
	item: ContentSearchItem,
	extraSearchText = "",
): SearchTextByField {
	return {
		title: normalizeSearchParts([item.title]),
		description: normalizeSearchParts([item.description, item.subtitle]),
		transcript: normalizeSearchParts([extraSearchText]),
	};
}

function buildSearchText(searchTextByField: SearchTextByField): string {
	return normalizeSearchParts(
		ALL_SEARCH_FIELDS.map((field) => searchTextByField[field]),
	);
}

function fuzzyMatch(source: string, query: string): boolean {
	if (!query) {
		return true;
	}

	return source.includes(query);
}

function normalizeTokens(tokens: string[]): string[] {
	return Array.from(
		new Set(tokens.map((token) => normalizeForSearch(token)).filter(Boolean)),
	);
}

function buildNormalizedSlices(value: string) {
	const slices: NormalizedSlice[] = [];
	let normalizedCursor = 0;
	let originalCursor = 0;

	for (const char of value) {
		const normalized = char.normalize("NFKC").toLowerCase();
		const originalStart = originalCursor;
		const originalEnd = originalStart + char.length;
		const normalizedStart = normalizedCursor;
		const normalizedEnd = normalizedStart + normalized.length;

		slices.push({
			originalStart,
			originalEnd,
			normalizedStart,
			normalizedEnd,
			normalized,
		});

		normalizedCursor = normalizedEnd;
		originalCursor = originalEnd;
	}

	return {
		slices,
		normalizedValue: slices.map((slice) => slice.normalized).join(""),
	};
}

function normalizeForRangeProbe(value: string): string {
	return value.normalize("NFKC").toLowerCase();
}

function hasAnyNormalizedToken(value: string, tokens: string[]): boolean {
	return tokens.some((token) => value.includes(token));
}

function collectNormalizedRanges(value: string, tokens: string[]): Range[] {
	const ranges: Range[] = [];

	tokens.forEach((token) => {
		let searchIndex = value.indexOf(token);
		while (searchIndex !== -1) {
			ranges.push({
				start: searchIndex,
				end: searchIndex + token.length,
			});
			searchIndex = value.indexOf(token, searchIndex + token.length);
		}
	});

	return ranges;
}

function mergeRanges(ranges: Range[]): Range[] {
	if (ranges.length <= 1) {
		return ranges.slice();
	}

	const sorted = ranges
		.slice()
		.sort((a, b) => a.start - b.start || a.end - b.end);
	const merged: Range[] = [];
	let current = sorted[0];

	for (let i = 1; i < sorted.length; i += 1) {
		const range = sorted[i];
		if (range.start <= current.end) {
			current = {
				start: current.start,
				end: Math.max(current.end, range.end),
			};
		} else {
			merged.push(current);
			current = range;
		}
	}

	merged.push(current);
	return merged;
}

function mapNormalizedRangeToOriginal(
	range: Range,
	slices: NormalizedSlice[],
): Range {
	if (slices.length === 0) {
		return { start: 0, end: 0 };
	}

	let start = slices[slices.length - 1].originalEnd;
	let end = slices[slices.length - 1].originalEnd;

	for (const slice of slices) {
		if (range.start < slice.normalizedEnd) {
			start = slice.originalStart;
			break;
		}
	}

	for (const slice of slices) {
		if (range.end <= slice.normalizedEnd) {
			end = slice.originalEnd;
			break;
		}
	}

	return { start, end };
}

function normalizeSnippetWhitespace(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

export function buildSearchSnippets(
	value: string,
	tokens: string[],
	options: SearchSnippetOptions = {},
): string[] {
	const normalizedTokens = normalizeTokens(tokens);
	if (!value || normalizedTokens.length === 0) {
		return [];
	}

	const normalizedProbe = normalizeForRangeProbe(value);
	if (!hasAnyNormalizedToken(normalizedProbe, normalizedTokens)) {
		return [];
	}

	const { slices, normalizedValue } = buildNormalizedSlices(value);
	const ranges = mergeRanges(
		collectNormalizedRanges(normalizedValue, normalizedTokens),
	);
	if (ranges.length === 0) {
		return [];
	}

	const contextLength = options.contextLength ?? DEFAULT_SNIPPET_CONTEXT_LENGTH;
	const maxSnippets = options.maxSnippets ?? DEFAULT_MAX_SNIPPETS;
	const snippets: string[] = [];
	const seen = new Set<string>();

	for (const range of ranges) {
		const originalRange = mapNormalizedRangeToOriginal(range, slices);
		if (originalRange.start >= originalRange.end) {
			continue;
		}

		const start = Math.max(0, originalRange.start - contextLength);
		const end = Math.min(value.length, originalRange.end + contextLength);
		const snippet = `${start > 0 ? "…" : ""}${normalizeSnippetWhitespace(
			value.slice(start, end),
		)}${end < value.length ? "…" : ""}`;

		if (!seen.has(snippet)) {
			seen.add(snippet);
			snippets.push(snippet);
		}
		if (snippets.length >= maxSnippets) {
			break;
		}
	}

	return snippets;
}

export function buildTranscriptSearchSnippets(
	cues: TranscriptCue[],
	tokens: string[],
	options: SearchSnippetOptions = {},
): TranscriptSearchSnippet[] {
	const normalizedTokens = normalizeTokens(tokens);
	if (cues.length === 0 || normalizedTokens.length === 0) {
		return [];
	}

	const maxSnippets = options.maxSnippets ?? DEFAULT_MAX_SNIPPETS;
	const snippets: TranscriptSearchSnippet[] = [];
	const seen = new Set<string>();

	for (const cue of cues) {
		const cueSnippets = buildSearchSnippets(cue.text, normalizedTokens, {
			...options,
			maxSnippets: 1,
		});
		const text = cueSnippets[0];
		if (!text || seen.has(text)) {
			continue;
		}

		seen.add(text);
		snippets.push({
			text,
			cueIndex: cue.index,
			start: cue.start,
			startLabel: cue.startLabel,
		});

		if (snippets.length >= maxSnippets) {
			break;
		}
	}

	return snippets;
}

export function buildSearchIndex<TItem extends ContentSearchItem>(
	items: TItem[],
	options: BuildSearchIndexOptions = {},
): IndexedContentItem<TItem>[] {
	return items.map((item) => {
		const searchTextByField = buildSearchTextByField(
			item,
			options.extraSearchTextByTalkId?.get(item.id),
		);
		return {
			data: item,
			searchText: buildSearchText(searchTextByField),
			searchTextByField,
		};
	});
}

export function tokenizeSearchQuery(query: string): string[] {
	if (!query) {
		return [];
	}

	const normalized = normalizeForSearch(query);
	if (!normalized) {
		return [];
	}

	return normalized.split(" ").filter(Boolean);
}

export function filterContentItemsByQuery<TItem extends ContentSearchItem>(
	indexedItems: IndexedContentItem<TItem>[],
	tokens: string[],
	fields?: readonly string[],
): TItem[] {
	if (tokens.length === 0) {
		return indexedItems.map((item) => item.data);
	}
	const selectedFields = normalizeSearchFields(fields);

	return indexedItems
		.filter(({ searchTextByField }) =>
			tokens.every((token) =>
				selectedFields.some((field) =>
					fuzzyMatch(searchTextByField[field], token),
				),
			),
		)
		.map(({ data }) => data);
}

export function filterTalksByQuery(
	indexedTalks: IndexedTalk[],
	tokens: string[],
	fields?: readonly string[],
): TalkForDisplay[] {
	return filterContentItemsByQuery(indexedTalks, tokens, fields);
}
