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

function buildTalkDetailPath(talkId: string): string {
	return `/talks/${encodeURIComponent(talkId)}`;
}

type TalkGalleryHrefOptions = {
	query?: string;
	collectionId?: ContentCollectionId | "";
	seriesId?: ContentSeriesId | "";
};

function normalizeTalkGalleryHrefOptions(
	queryOrOptions: string | TalkGalleryHrefOptions,
): TalkGalleryHrefOptions {
	if (typeof queryOrOptions === "string") {
		return { query: queryOrOptions };
	}
	return queryOrOptions;
}

export function buildTalksHref(
	queryOrOptions: string | TalkGalleryHrefOptions = "",
): string {
	const {
		query = "",
		collectionId = "",
		seriesId = "",
	} = normalizeTalkGalleryHrefOptions(queryOrOptions);
	const trimmedQuery = query.trim();
	if (!trimmedQuery && !collectionId && !seriesId) {
		return "/talks";
	}

	const params = new URLSearchParams();
	if (trimmedQuery) {
		params.set(TALK_GALLERY_QUERY_PARAM, trimmedQuery);
	}
	if (collectionId) {
		params.set(TALK_GALLERY_COLLECTION_PARAM, collectionId);
	}
	if (seriesId) {
		params.set(TALK_GALLERY_SERIES_PARAM, seriesId);
	}
	return `/talks?${params.toString()}`;
}

export function buildTalkDetailHref(
	talkId: string,
	galleryQuery: string | undefined = "",
	galleryCollectionId: ContentCollectionId | "" = "",
	gallerySeriesId: ContentSeriesId | "" = "",
): string {
	const trimmedGalleryQuery = galleryQuery.trim();
	if (!trimmedGalleryQuery && !galleryCollectionId && !gallerySeriesId) {
		return buildTalkDetailPath(talkId);
	}

	const params = new URLSearchParams();
	if (trimmedGalleryQuery) {
		params.set(TALK_DETAIL_GALLERY_QUERY_PARAM, trimmedGalleryQuery);
	}
	if (galleryCollectionId) {
		params.set(TALK_DETAIL_GALLERY_COLLECTION_PARAM, galleryCollectionId);
	}
	if (gallerySeriesId) {
		params.set(TALK_DETAIL_GALLERY_SERIES_PARAM, gallerySeriesId);
	}
	return `${buildTalkDetailPath(talkId)}?${params.toString()}`;
}

export function buildTranscriptCueHref(
	talkId: string,
	cueIndex: number,
	searchQuery: string | undefined = "",
	galleryCollectionId: ContentCollectionId | "" = "",
	gallerySeriesId: ContentSeriesId | "" = "",
): string {
	const params = new URLSearchParams();
	const trimmedSearchQuery = searchQuery.trim();
	if (trimmedSearchQuery) {
		params.set(TALK_DETAIL_TRANSCRIPT_QUERY_PARAM, trimmedSearchQuery);
		params.set(TALK_DETAIL_GALLERY_QUERY_PARAM, trimmedSearchQuery);
	}
	if (galleryCollectionId) {
		params.set(TALK_DETAIL_GALLERY_COLLECTION_PARAM, galleryCollectionId);
	}
	if (gallerySeriesId) {
		params.set(TALK_DETAIL_GALLERY_SERIES_PARAM, gallerySeriesId);
	}
	params.set(TALK_DETAIL_TRANSCRIPT_CUE_PARAM, String(cueIndex));

	return `${buildTalkDetailPath(talkId)}?${params.toString()}#transcript-cue-${cueIndex}`;
}
