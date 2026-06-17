export const TALK_GALLERY_QUERY_PARAM = "query";
export const TALK_DETAIL_GALLERY_QUERY_PARAM = "galleryQuery";
export const TALK_DETAIL_TRANSCRIPT_QUERY_PARAM = "transcriptQuery";
export const TALK_DETAIL_TRANSCRIPT_CUE_PARAM = "transcriptCue";

export function getFirstSearchParam(
	value: string | string[] | undefined,
): string {
	if (Array.isArray(value)) {
		return value[0] ?? "";
	}
	return value ?? "";
}

export function parseTranscriptCueIndex(value: string): number | null {
	if (!value) {
		return null;
	}

	const cueIndex = Number(value);
	return Number.isInteger(cueIndex) && cueIndex > 0 ? cueIndex : null;
}

function buildTalkDetailPath(talkId: string): string {
	return `/talks/${encodeURIComponent(talkId)}`;
}

export function buildTalksHref(query = ""): string {
	const trimmedQuery = query.trim();
	if (!trimmedQuery) {
		return "/talks";
	}

	const params = new URLSearchParams({
		[TALK_GALLERY_QUERY_PARAM]: trimmedQuery,
	});
	return `/talks?${params.toString()}`;
}

export function buildTalkDetailHref(
	talkId: string,
	galleryQuery: string | undefined = "",
): string {
	const trimmedGalleryQuery = galleryQuery.trim();
	if (!trimmedGalleryQuery) {
		return buildTalkDetailPath(talkId);
	}

	const params = new URLSearchParams({
		[TALK_DETAIL_GALLERY_QUERY_PARAM]: trimmedGalleryQuery,
	});
	return `${buildTalkDetailPath(talkId)}?${params.toString()}`;
}

export function buildTranscriptCueHref(
	talkId: string,
	cueIndex: number,
	searchQuery: string | undefined = "",
): string {
	const params = new URLSearchParams();
	const trimmedSearchQuery = searchQuery.trim();
	if (trimmedSearchQuery) {
		params.set(TALK_DETAIL_TRANSCRIPT_QUERY_PARAM, trimmedSearchQuery);
		params.set(TALK_DETAIL_GALLERY_QUERY_PARAM, trimmedSearchQuery);
	}
	params.set(TALK_DETAIL_TRANSCRIPT_CUE_PARAM, String(cueIndex));

	return `${buildTalkDetailPath(talkId)}?${params.toString()}#transcript-cue-${cueIndex}`;
}
