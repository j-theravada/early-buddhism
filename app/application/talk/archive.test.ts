import { describe, expect, test } from "bun:test";
import type { TalkGalleryItem } from "../../domain/talk/types";
import {
	buildTalkArchivePage,
	getTalkArchivePageCount,
	TALK_ARCHIVE_PAGE_SIZE,
} from "./archive";

function createItem(index: number): TalkGalleryItem {
	return {
		id: `TALK-${index}`,
		dvdId: `V-${index}`,
		collectionId: "monthly_talk",
		collectionLabel: "月例講演会",
		seriesId: "",
		seriesLabel: "",
		title: `法話 ${index}`,
		subtitle: "",
		attachmentsLink: null,
		youtubeUrl: null,
		thumbnailUrl: null,
		recordedOnFormatted: `2000年1月${index}日`,
		recordedOnSortValue: index,
		decadeLabel: "2000年代",
		themeLabel: "テーマ",
	};
}

describe("talk archive pagination", () => {
	test("100件ずつ分割して全件を重複なく返す", () => {
		const items = Array.from({ length: 201 }, (_, index) => createItem(index));
		const pages = [1, 2, 3].map((page) => buildTalkArchivePage(items, page));

		expect(TALK_ARCHIVE_PAGE_SIZE).toBe(100);
		expect(getTalkArchivePageCount(items.length)).toBe(3);
		expect(pages.map((page) => page?.items.length)).toEqual([100, 100, 1]);
		expect(pages.map((page) => [page?.previousPage, page?.nextPage])).toEqual([
			[null, 2],
			[1, 3],
			[2, null],
		]);
		expect(
			pages.flatMap((page) => page?.items.map((item) => item.id) ?? []),
		).toEqual(items.map((item) => item.id));
	});

	test("範囲外と非整数ページを拒否する", () => {
		const items = [createItem(1)];
		expect(buildTalkArchivePage(items, 0)).toBeNull();
		expect(buildTalkArchivePage(items, 1.5)).toBeNull();
		expect(buildTalkArchivePage(items, 2)).toBeNull();
	});
});
