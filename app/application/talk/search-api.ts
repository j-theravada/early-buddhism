// This module is the JSON decoder boundary; unknown inputs and a temporary key-value view are intentional here.
/* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-unsafe-dictionary-type */
export type TalkSearchTranscriptSnippet = {
	text: string;
	cueIndex: number;
	start?: number;
	startLabel?: string;
};

export type TalkSearchApiResult = {
	talkId: string;
	transcriptSnippets: TalkSearchTranscriptSnippet[];
};

export type TalkSearchApiResponse = {
	talkIds: string[];
	results: TalkSearchApiResult[];
};

export type ParsedTalkSearchApiResponse = {
	talkIds: Set<string>;
	transcriptSnippetsByTalkId: Map<string, TalkSearchTranscriptSnippet[]>;
};

export function buildEmptyTalkSearchApiResponse(): TalkSearchApiResponse {
	return { talkIds: [], results: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
	return typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

function parseTalkIds(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.filter(isString);
}

function parseTranscriptSnippet(
	value: unknown,
): TalkSearchTranscriptSnippet | null {
	if (!isRecord(value)) {
		return null;
	}
	if (!isString(value.text) || !isFiniteNumber(value.cueIndex)) {
		return null;
	}

	return {
		text: value.text,
		cueIndex: value.cueIndex,
		...(isFiniteNumber(value.start) && { start: value.start }),
		...(isString(value.startLabel) && {
			startLabel: value.startLabel,
		}),
	};
}

function parseTranscriptSnippets(
	value: unknown,
): TalkSearchTranscriptSnippet[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.flatMap((snippet) => {
		const parsedSnippet = parseTranscriptSnippet(snippet);
		return parsedSnippet ? [parsedSnippet] : [];
	});
}

function parseSnippetMap(
	value: unknown,
): Map<string, TalkSearchTranscriptSnippet[]> {
	const snippetsByTalkId = new Map<string, TalkSearchTranscriptSnippet[]>();
	if (!Array.isArray(value)) {
		return snippetsByTalkId;
	}

	for (const item of value) {
		if (!isRecord(item) || !isString(item.talkId)) {
			continue;
		}

		const snippets = parseTranscriptSnippets(item.transcriptSnippets);
		if (snippets.length > 0) {
			snippetsByTalkId.set(item.talkId, snippets);
		}
	}

	return snippetsByTalkId;
}

export function parseTalkSearchApiResponse(
	response: unknown,
): ParsedTalkSearchApiResponse {
	if (!isRecord(response)) {
		return {
			talkIds: new Set(),
			transcriptSnippetsByTalkId: new Map(),
		};
	}

	return {
		talkIds: new Set(parseTalkIds(response.talkIds)),
		transcriptSnippetsByTalkId: parseSnippetMap(response.results),
	};
}
