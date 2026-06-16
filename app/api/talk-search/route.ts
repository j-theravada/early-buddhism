import { NextResponse } from "next/server";
import { buildTalkGalleryTalks } from "../../application/talk/gallery";
import {
	buildSearchIndex,
	buildTranscriptSearchSnippets,
	filterTalksByQuery,
	tokenizeSearchQuery,
	type IndexedTalk,
} from "../../application/talk/search";
import { normalizeTalkId } from "../../domain/talk/id";
import { getTalks } from "../../infrastructure/talk/repository";
import {
	getTranscriptSearchDocuments,
	type TranscriptSearchDocument,
} from "../../infrastructure/transcript/repository";

const MAX_QUERY_LENGTH = 120;

type TranscriptAwareSearchData = {
	indexedTalks: IndexedTalk[];
	transcriptTextByTalkId: Map<string, string>;
	transcriptDocumentByTalkId: Map<string, TranscriptSearchDocument>;
};

let searchDataPromise: Promise<TranscriptAwareSearchData> | null = null;

export const runtime = "nodejs";

async function getTranscriptAwareSearchData(): Promise<TranscriptAwareSearchData> {
	searchDataPromise ??= (async () => {
		const [talks, transcriptDocuments] = await Promise.all([
			getTalks(),
			getTranscriptSearchDocuments(),
		]);
		const talksForDisplay = buildTalkGalleryTalks(talks);
		const transcriptTextByNormalizedTalkId = new Map(
			transcriptDocuments.map((document) => [
				normalizeTalkId(document.talkId),
				document.text,
			]),
		);
		const transcriptDocumentByNormalizedTalkId = new Map(
			transcriptDocuments.map((document) => [
				normalizeTalkId(document.talkId),
				document,
			]),
		);
		const extraSearchTextByTalkId = new Map(
			talksForDisplay.map((talk) => [
				talk.id,
				transcriptTextByNormalizedTalkId.get(normalizeTalkId(talk.id)) ?? "",
			]),
		);
		const transcriptDocumentByTalkId = new Map(
			talksForDisplay.flatMap((talk) => {
				const document = transcriptDocumentByNormalizedTalkId.get(
					normalizeTalkId(talk.id),
				);
				return document ? [[talk.id, document] as const] : [];
			}),
		);

		return {
			indexedTalks: buildSearchIndex(talksForDisplay, {
				extraSearchTextByTalkId,
			}),
			transcriptTextByTalkId: extraSearchTextByTalkId,
			transcriptDocumentByTalkId,
		};
	})();

	return searchDataPromise;
}

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const query = (searchParams.get("query") ?? "").slice(0, MAX_QUERY_LENGTH);
	const tokens = tokenizeSearchQuery(query);

	if (tokens.length === 0) {
		return NextResponse.json({ talkIds: [], results: [] });
	}

	const { indexedTalks, transcriptDocumentByTalkId } =
		await getTranscriptAwareSearchData();
	const talks = filterTalksByQuery(indexedTalks, tokens);
	const results = talks.map((talk) => ({
		talkId: talk.id,
		transcriptSnippets: buildTranscriptSearchSnippets(
			transcriptDocumentByTalkId.get(talk.id)?.cues ?? [],
			tokens,
		),
	}));

	return NextResponse.json({
		talkIds: talks.map((talk) => talk.id),
		results,
	});
}
