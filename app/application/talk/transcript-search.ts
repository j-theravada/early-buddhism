import { normalizeTalkId } from "../../domain/talk/id";
import type { Talk, TalkForDisplay } from "../../domain/talk/types";
import type { TranscriptCue } from "../../domain/transcript/types";
import { buildTalkGalleryTalks } from "./gallery";
import {
	buildSearchIndex,
	buildTranscriptSearchSnippets,
	filterTalksByQuery,
	normalizeForSearch,
	normalizeSearchFields,
	tokenizeSearchQuery,
	type IndexedTalk,
	type SearchField,
	type TranscriptSearchSnippet,
} from "./search";
import {
	buildEmptyTalkSearchApiResponse,
	type TalkSearchApiResponse,
} from "./search-api";

export type TranscriptSearchDocumentInput = {
	talkId: string;
	text: string;
	cues: TranscriptCue[];
};

export type TranscriptAwareSearchData = {
	indexedTalks: IndexedTalk[];
	transcriptDocumentByTalkId: Map<string, TranscriptSearchDocumentInput>;
	transcriptSearchTextByTalkId: Map<string, string>;
};

function buildTranscriptDocumentIndex(
	transcriptDocuments: TranscriptSearchDocumentInput[],
): Map<string, TranscriptSearchDocumentInput> {
	return new Map(
		transcriptDocuments.map((document) => [
			normalizeTalkId(document.talkId),
			document,
		]),
	);
}

function findTranscriptDocument(
	talk: TalkForDisplay,
	transcriptDocumentByNormalizedTalkId: ReadonlyMap<
		string,
		TranscriptSearchDocumentInput
	>,
): TranscriptSearchDocumentInput | undefined {
	return transcriptDocumentByNormalizedTalkId.get(normalizeTalkId(talk.id));
}

type TranscriptSearchMaps = Pick<
	TranscriptAwareSearchData,
	"transcriptDocumentByTalkId" | "transcriptSearchTextByTalkId"
>;

function buildTranscriptSearchMaps(
	talks: TalkForDisplay[],
	transcriptDocumentByNormalizedTalkId: ReadonlyMap<
		string,
		TranscriptSearchDocumentInput
	>,
): TranscriptSearchMaps {
	const transcriptDocumentByTalkId = new Map<
		string,
		TranscriptSearchDocumentInput
	>();
	const transcriptSearchTextByTalkId = new Map<string, string>();

	for (const talk of talks) {
		const document = findTranscriptDocument(
			talk,
			transcriptDocumentByNormalizedTalkId,
		);
		if (!document) {
			continue;
		}

		transcriptDocumentByTalkId.set(talk.id, document);
		transcriptSearchTextByTalkId.set(
			talk.id,
			normalizeForSearch(document.text),
		);
	}

	return {
		transcriptDocumentByTalkId,
		transcriptSearchTextByTalkId,
	};
}

export function hasTranscriptAwareSearchQuery(query: string): boolean {
	return tokenizeSearchQuery(query).length > 0;
}

export function buildTranscriptAwareSearchData(
	talks: Talk[],
	transcriptDocuments: TranscriptSearchDocumentInput[],
): TranscriptAwareSearchData {
	const talksForDisplay = buildTalkGalleryTalks(talks);
	const transcriptDocumentByNormalizedTalkId =
		buildTranscriptDocumentIndex(transcriptDocuments);
	const { transcriptDocumentByTalkId, transcriptSearchTextByTalkId } =
		buildTranscriptSearchMaps(
			talksForDisplay,
			transcriptDocumentByNormalizedTalkId,
		);

	return {
		indexedTalks: buildSearchIndex(talksForDisplay, {
			extraSearchTextByTalkId: transcriptSearchTextByTalkId,
		}),
		transcriptDocumentByTalkId,
		transcriptSearchTextByTalkId,
	};
}

function filterTranscriptAwareTalks(
	searchData: TranscriptAwareSearchData,
	tokens: string[],
	fields?: readonly string[],
): TalkForDisplay[] {
	return filterTalksByQuery(searchData.indexedTalks, tokens, fields);
}

function hasTranscriptTokenMatch(
	searchData: TranscriptAwareSearchData,
	talkId: string,
	tokens: string[],
	fields?: readonly string[],
): boolean {
	if (!normalizeSearchFields(fields).includes("transcript")) return false;
	const transcriptSearchText =
		searchData.transcriptSearchTextByTalkId.get(talkId);
	return (
		typeof transcriptSearchText === "string" &&
		tokens.some((token) => transcriptSearchText.includes(token))
	);
}

export function findTranscriptAwareTalkIds(
	searchData: TranscriptAwareSearchData,
	query: string,
	fields?: readonly string[],
): string[] {
	const tokens = tokenizeSearchQuery(query);
	if (tokens.length === 0) return [];

	return filterTranscriptAwareTalks(searchData, tokens, fields).map(
		(talk) => talk.id,
	);
}

export function buildTranscriptSnippetsByTalkId(
	searchData: TranscriptAwareSearchData,
	query: string,
	talkIds: readonly string[],
	fields?: readonly string[],
): Map<string, TranscriptSearchSnippet[]> {
	const tokens = tokenizeSearchQuery(query);
	const snippetsByTalkId = new Map<string, TranscriptSearchSnippet[]>();
	if (tokens.length === 0) return snippetsByTalkId;

	for (const talkId of talkIds) {
		if (!hasTranscriptTokenMatch(searchData, talkId, tokens, fields)) continue;
		const snippets = buildTranscriptSearchSnippets(
			searchData.transcriptDocumentByTalkId.get(talkId)?.cues ?? [],
			tokens,
		);
		if (snippets.length > 0) {
			snippetsByTalkId.set(talkId, snippets);
		}
	}

	return snippetsByTalkId;
}

export function searchTranscriptAwareTalks(
	searchData: TranscriptAwareSearchData,
	query: string,
	fields?: readonly SearchField[],
): TalkSearchApiResponse {
	const talkIds = findTranscriptAwareTalkIds(searchData, query, fields);
	if (talkIds.length === 0) {
		return buildEmptyTalkSearchApiResponse();
	}
	const snippetsByTalkId = buildTranscriptSnippetsByTalkId(
		searchData,
		query,
		talkIds,
		fields,
	);
	return {
		talkIds,
		results: talkIds.flatMap((talkId) => {
			const transcriptSnippets = snippetsByTalkId.get(talkId);
			return transcriptSnippets ? [{ talkId, transcriptSnippets }] : [];
		}),
	};
}
