import type { TalkGalleryItem } from "../../domain/talk/types";

export const TALK_ARCHIVE_PAGE_SIZE = 100;

export type TalkArchivePage = {
	page: number;
	totalPages: number;
	items: TalkGalleryItem[];
	previousPage: number | null;
	nextPage: number | null;
};

export function getTalkArchivePageCount(totalItems: number): number {
	return Math.max(1, Math.ceil(totalItems / TALK_ARCHIVE_PAGE_SIZE));
}

export function buildTalkArchivePage(
	items: TalkGalleryItem[],
	page: number,
): TalkArchivePage | null {
	const totalPages = getTalkArchivePageCount(items.length);
	if (!Number.isInteger(page) || page < 1 || page > totalPages) return null;

	const start = (page - 1) * TALK_ARCHIVE_PAGE_SIZE;
	return {
		page,
		totalPages,
		items: items.slice(start, start + TALK_ARCHIVE_PAGE_SIZE),
		previousPage: page > 1 ? page - 1 : null,
		nextPage: page < totalPages ? page + 1 : null,
	};
}
