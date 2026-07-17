import type {
	ContentCollectionId,
	ContentSeriesId,
} from "../../domain/content/types";

export const TALK_GALLERY_QUERY_PARAM = "query";
export const TALK_GALLERY_COLLECTION_PARAM = "collection";
export const TALK_GALLERY_SERIES_PARAM = "series";
export const TALK_DETAIL_GALLERY_QUERY_PARAM = "galleryQuery";
export const TALK_DETAIL_GALLERY_COLLECTION_PARAM = "galleryCollection";
export const TALK_DETAIL_GALLERY_SERIES_PARAM = "gallerySeries";
export const TALK_DETAIL_GALLERY_PAGE_PARAM = "galleryPage";
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
	return Number.isInteger(cueIndex) && cueIndex >= 0 ? cueIndex : null;
}

export function parseTalkDetailGalleryPage(value: string): number {
	if (!/^[1-9]\d*$/.test(value)) return 1;
	const page = Number(value);
	return Number.isSafeInteger(page) ? page : 1;
}

function buildTalkDetailPath(talkId: string): string {
	return `/talks/${encodeURIComponent(talkId)}`;
}

export function buildTalkArchiveHref(page: number): string {
	return `/talks/archive/${page}`;
}

export type TalkGalleryHrefOptions = {
	page?: number;
	query?: string;
	collectionId?: ContentCollectionId | "";
	seriesId?: ContentSeriesId | "";
};

function normalizeGalleryPage(page: number | undefined): number {
	return Number.isSafeInteger(page) && (page ?? 1) > 1 ? page! : 1;
}

function appendGalleryDetailParams(
	params: URLSearchParams,
	options: TalkGalleryHrefOptions,
) {
	const query = options.query?.trim() ?? "";
	if (query) params.set(TALK_DETAIL_GALLERY_QUERY_PARAM, query);
	if (options.collectionId) {
		params.set(TALK_DETAIL_GALLERY_COLLECTION_PARAM, options.collectionId);
	}
	if (options.seriesId) {
		params.set(TALK_DETAIL_GALLERY_SERIES_PARAM, options.seriesId);
	}
	const page = normalizeGalleryPage(options.page);
	if (page > 1) {
		params.set(TALK_DETAIL_GALLERY_PAGE_PARAM, String(page));
	}
}

export function buildTalksHref(
	queryOrOptions: string | TalkGalleryHrefOptions = "",
): string {
	const options =
		typeof queryOrOptions === "string"
			? { query: queryOrOptions }
			: queryOrOptions;
	const page = normalizeGalleryPage(options.page);
	const path = page > 1 ? `/talks/page/${page}` : "/talks";
	const params = new URLSearchParams();
	const query = options.query?.trim() ?? "";
	if (query) {
		params.set(TALK_GALLERY_QUERY_PARAM, query);
	}
	if (options.collectionId) {
		params.set(TALK_GALLERY_COLLECTION_PARAM, options.collectionId);
	}
	if (options.seriesId) {
		params.set(TALK_GALLERY_SERIES_PARAM, options.seriesId);
	}
	const search = params.toString();
	return search ? `${path}?${search}` : path;
}

export function buildTalkDetailHref(
	talkId: string,
	options: TalkGalleryHrefOptions = {},
): string {
	const params = new URLSearchParams();
	appendGalleryDetailParams(params, options);
	const search = params.toString();
	const path = buildTalkDetailPath(talkId);
	return search ? `${path}?${search}` : path;
}

export function buildTranscriptCueHref(
	talkId: string,
	cueIndex: number,
	options: TalkGalleryHrefOptions = {},
): string {
	const params = new URLSearchParams();
	const query = options.query?.trim() ?? "";
	if (query) {
		params.set(TALK_DETAIL_TRANSCRIPT_QUERY_PARAM, query);
	}
	appendGalleryDetailParams(params, options);
	params.set(TALK_DETAIL_TRANSCRIPT_CUE_PARAM, String(cueIndex));

	return `${buildTalkDetailPath(talkId)}?${params.toString()}#transcript-cue-${cueIndex}`;
}
