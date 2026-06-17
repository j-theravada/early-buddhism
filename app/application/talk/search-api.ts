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

export function buildTalkSearchApiUrl(query: string): string {
	return `/api/talk-search?query=${encodeURIComponent(query)}`;
}

export function buildEmptyTalkSearchApiResponse(): TalkSearchApiResponse {
	return { talkIds: [], results: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function parseTalkIds(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.filter((talkId): talkId is string => typeof talkId === "string");
}

function parseTranscriptSnippet(
	value: unknown,
): TalkSearchTranscriptSnippet | null {
	if (!isRecord(value)) {
		return null;
	}
	if (
		typeof value.text !== "string" ||
		typeof value.cueIndex !== "number" ||
		!Number.isFinite(value.cueIndex)
	) {
		return null;
	}

	return {
		text: value.text,
		cueIndex: value.cueIndex,
		...(typeof value.start === "number" &&
			Number.isFinite(value.start) && { start: value.start }),
		...(typeof value.startLabel === "string" && {
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
		if (!isRecord(item) || typeof item.talkId !== "string") {
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
