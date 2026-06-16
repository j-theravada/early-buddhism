import type { TalkForDisplay } from "../../domain/talk/types";
import type { TranscriptCue } from "../../domain/transcript/types";

export type IndexedTalk = {
	data: TalkForDisplay;
	searchText: string;
};

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

function normalizeForSearch(value: string): string {
	return value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function buildSearchText(talk: TalkForDisplay, extraSearchText = ""): string {
	return normalizeForSearch(
		[
			talk.dvdId,
			talk.title,
			talk.subtitle,
			talk.event,
			talk.venue,
			talk.speaker,
			talk.language,
			talk.recordedOnFormatted,
			talk.recordedOnRaw,
			talk.decadeLabel,
			talk.themeLabel,
			extraSearchText,
		]
			.filter(Boolean)
			.join(" "),
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

export function buildSearchIndex(
	talks: TalkForDisplay[],
	options: BuildSearchIndexOptions = {},
): IndexedTalk[] {
	return talks.map((talk) => ({
		data: talk,
		searchText: buildSearchText(
			talk,
			options.extraSearchTextByTalkId?.get(talk.id),
		),
	}));
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

export function filterTalksByQuery(
	indexedTalks: IndexedTalk[],
	tokens: string[],
): TalkForDisplay[] {
	if (tokens.length === 0) {
		return indexedTalks.map((item) => item.data);
	}

	return indexedTalks
		.filter(({ searchText }) =>
			tokens.every((token) => fuzzyMatch(searchText, token)),
		)
		.map(({ data }) => data);
}
