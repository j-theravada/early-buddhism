import { NextResponse } from "next/server";
import {
	buildEmptyTalkSearchApiResponse,
	type TalkSearchApiResponse,
} from "../../application/talk/search-api";
import { tokenizeSearchQuery } from "../../application/talk/search";
import { searchTalkDatabase } from "../../infrastructure/search/talk-search-database";

const MAX_QUERY_LENGTH = 120;
const SEARCH_RESPONSE_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_SEARCH_RESPONSE_CACHE_SIZE = 100;
const SEARCH_RESPONSE_CACHE_CONTROL =
	"public, max-age=0, s-maxage=300, stale-while-revalidate=600";

export const runtime = "nodejs";

const searchResponseCache = new Map<
	string,
	{ expiresAt: number; response: TalkSearchApiResponse }
>();

function createSearchResponse(response: TalkSearchApiResponse) {
	return NextResponse.json(response, {
		headers: {
			"Cache-Control": SEARCH_RESPONSE_CACHE_CONTROL,
		},
	});
}

function createSearchErrorResponse() {
	return NextResponse.json(
		{ error: "Talk search is temporarily unavailable." },
		{
			status: 503,
			headers: {
				"Cache-Control": "no-store",
			},
		},
	);
}

function readCachedSearchResponse(
	cacheKey: string,
	now = Date.now(),
): TalkSearchApiResponse | null {
	const cached = searchResponseCache.get(cacheKey);
	if (!cached) {
		return null;
	}
	if (cached.expiresAt <= now) {
		searchResponseCache.delete(cacheKey);
		return null;
	}
	return cached.response;
}

function writeCachedSearchResponse(
	cacheKey: string,
	response: TalkSearchApiResponse,
	now = Date.now(),
) {
	if (searchResponseCache.size >= MAX_SEARCH_RESPONSE_CACHE_SIZE) {
		const oldestKey = searchResponseCache.keys().next().value;
		if (oldestKey) {
			searchResponseCache.delete(oldestKey);
		}
	}
	searchResponseCache.set(cacheKey, {
		expiresAt: now + SEARCH_RESPONSE_CACHE_TTL_MS,
		response,
	});
}

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const query = (searchParams.get("query") ?? "").slice(0, MAX_QUERY_LENGTH);
	const tokens = tokenizeSearchQuery(query);

	if (tokens.length === 0) {
		return createSearchResponse(buildEmptyTalkSearchApiResponse());
	}

	const normalizedQuery = tokens.join(" ");
	const cacheKey = tokens.join("\u0000");
	const cachedResponse = readCachedSearchResponse(cacheKey);
	if (cachedResponse) {
		return createSearchResponse(cachedResponse);
	}

	try {
		const response = await searchTalkDatabase(normalizedQuery);
		writeCachedSearchResponse(cacheKey, response);
		return createSearchResponse(response);
	} catch (error) {
		console.error("Talk search database query failed.", error);
		return createSearchErrorResponse();
	}
}
