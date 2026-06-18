import { NextResponse } from "next/server";
import { buildEmptyTalkSearchApiResponse } from "../../application/talk/search-api";
import { tokenizeSearchQuery } from "../../application/talk/search";
import { searchTalkDatabase } from "../../infrastructure/search/talk-search-database";

const MAX_QUERY_LENGTH = 120;

export const runtime = "nodejs";

async function searchGeneratedTranscriptData(query: string) {
	const [
		{ buildTranscriptAwareSearchData, searchTranscriptAwareTalks },
		{ getTalks },
		{ getTranscriptSearchDocuments },
	] = await Promise.all([
		import("../../application/talk/transcript-search"),
		import("../../infrastructure/talk/repository"),
		import("../../infrastructure/transcript/repository"),
	]);
	const [talks, transcriptDocuments] = await Promise.all([
		getTalks(),
		getTranscriptSearchDocuments(),
	]);
	return searchTranscriptAwareTalks(
		buildTranscriptAwareSearchData(talks, transcriptDocuments),
		query,
	);
}

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const query = (searchParams.get("query") ?? "").slice(0, MAX_QUERY_LENGTH);

	if (tokenizeSearchQuery(query).length === 0) {
		return NextResponse.json(buildEmptyTalkSearchApiResponse());
	}

	try {
		return NextResponse.json(await searchTalkDatabase(query));
	} catch (error) {
		console.warn("Falling back to generated transcript search data.", error);
		return NextResponse.json(await searchGeneratedTranscriptData(query));
	}
}
