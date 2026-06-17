import { NextResponse } from "next/server";
import { buildEmptyTalkSearchApiResponse } from "../../application/talk/search-api";
import {
	buildTranscriptAwareSearchData,
	hasTranscriptAwareSearchQuery,
	searchTranscriptAwareTalks,
	type TranscriptAwareSearchData,
} from "../../application/talk/transcript-search";
import { getTalks } from "../../infrastructure/talk/repository";
import { getTranscriptSearchDocuments } from "../../infrastructure/transcript/repository";

const MAX_QUERY_LENGTH = 120;

let searchDataPromise: Promise<TranscriptAwareSearchData> | null = null;

export const runtime = "nodejs";

async function getTranscriptAwareSearchData(): Promise<TranscriptAwareSearchData> {
	searchDataPromise ??= (async () => {
		const [talks, transcriptDocuments] = await Promise.all([
			getTalks(),
			getTranscriptSearchDocuments(),
		]);
		return buildTranscriptAwareSearchData(talks, transcriptDocuments);
	})();

	return searchDataPromise;
}

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const query = (searchParams.get("query") ?? "").slice(0, MAX_QUERY_LENGTH);

	if (!hasTranscriptAwareSearchQuery(query)) {
		return NextResponse.json(buildEmptyTalkSearchApiResponse());
	}

	const searchData = await getTranscriptAwareSearchData();
	return NextResponse.json(searchTranscriptAwareTalks(searchData, query));
}
