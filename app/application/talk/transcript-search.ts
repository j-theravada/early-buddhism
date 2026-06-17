import { normalizeTalkId } from "../../domain/talk/id";
import type { Talk, TalkForDisplay } from "../../domain/talk/types";
import type { TranscriptCue } from "../../domain/transcript/types";
import { buildTalkGalleryTalks } from "./gallery";
import {
	buildSearchIndex,
	buildTranscriptSearchSnippets,
	filterTalksByQuery,
	tokenizeSearchQuery,
	type IndexedTalk,
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

function buildExtraSearchTextByTalkId(
	talks: TalkForDisplay[],
	transcriptDocumentByNormalizedTalkId: ReadonlyMap<
		string,
		TranscriptSearchDocumentInput
	>,
): Map<string, string> {
	return new Map(
		talks.map((talk) => [
			talk.id,
			findTranscriptDocument(talk, transcriptDocumentByNormalizedTalkId)
				?.text ?? "",
		]),
	);
}

function buildTranscriptDocumentByTalkId(
	talks: TalkForDisplay[],
	transcriptDocumentByNormalizedTalkId: ReadonlyMap<
		string,
		TranscriptSearchDocumentInput
	>,
): Map<string, TranscriptSearchDocumentInput> {
	const documentsByTalkId = new Map<string, TranscriptSearchDocumentInput>();

	for (const talk of talks) {
		const document = findTranscriptDocument(
			talk,
			transcriptDocumentByNormalizedTalkId,
		);
		if (document) {
			documentsByTalkId.set(talk.id, document);
		}
	}

	return documentsByTalkId;
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
	const extraSearchTextByTalkId = buildExtraSearchTextByTalkId(
		talksForDisplay,
		transcriptDocumentByNormalizedTalkId,
	);

	return {
		indexedTalks: buildSearchIndex(talksForDisplay, {
			extraSearchTextByTalkId,
		}),
		transcriptDocumentByTalkId: buildTranscriptDocumentByTalkId(
			talksForDisplay,
			transcriptDocumentByNormalizedTalkId,
		),
	};
}

export function searchTranscriptAwareTalks(
	searchData: TranscriptAwareSearchData,
	query: string,
): TalkSearchApiResponse {
	const tokens = tokenizeSearchQuery(query);
	if (tokens.length === 0) {
		return buildEmptyTalkSearchApiResponse();
	}

	const talks = filterTalksByQuery(searchData.indexedTalks, tokens);

	return {
		talkIds: talks.map((talk) => talk.id),
		results: talks.map((talk) => ({
			talkId: talk.id,
			transcriptSnippets: buildTranscriptSearchSnippets(
				searchData.transcriptDocumentByTalkId.get(talk.id)?.cues ?? [],
				tokens,
			),
		})),
	};
}
