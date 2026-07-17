import { describe, expect, test } from "bun:test";
import type { TalkGalleryItem } from "../../domain/talk/types";
import {
	buildTalkListingPage,
	buildTalkListingSections,
	normalizeTalkListingRequest,
	TALK_LISTING_PAGE_SIZE,
} from "./listing";

function createItem(index: number, overrides: Partial<TalkGalleryItem> = {}) {
	return {
		id: `TALK-${String(index).padStart(3, "0")}`,
		dvdId: `V-${index}`,
		collectionId: "monthly_talk" as const,
		collectionLabel: "月例講演会",
		seriesId: "",
		seriesLabel: "",
		title: `法話 ${index}`,
		subtitle: "",
		attachmentsLink: null,
		youtubeUrl: null,
		thumbnailUrl: null,
		recordedOnFormatted: "2024年1月1日",
		recordedOnSortValue: 2_000_000 - index,
		decadeLabel: "2020年代",
		themeLabel: "",
		...overrides,
	} satisfies TalkGalleryItem;
}

describe("talk listing model", () => {
	test("901件を新しい順のまま30件ずつ31ページへ分ける", () => {
		const items = Array.from({ length: 901 }, (_, index) =>
			createItem(index + 1),
		);
		const ids: string[] = [];
		for (let page = 1; page <= 31; page += 1) {
			const normalized = normalizeTalkListingRequest(items, {
				page: String(page),
			});
			expect(normalized).not.toBeNull();
			const result = buildTalkListingPage(items, normalized!);
			expect(result).not.toBeNull();
			ids.push(...result!.items.map((item) => item.id));
			expect(result!.items).toHaveLength(page === 31 ? 1 : 30);
		}
		expect(ids).toEqual(items.map((item) => item.id));
		expect(TALK_LISTING_PAGE_SIZE).toBe(30);
	});

	test("非正規ページ表記と範囲外を拒否する", () => {
		const items = Array.from({ length: 31 }, (_, index) =>
			createItem(index + 1),
		);
		for (const page of ["0", "-1", "02", "2.0", "1e1", "x"]) {
			expect(normalizeTalkListingRequest(items, { page })).toBeNull();
		}
		const normalized = normalizeTalkListingRequest(items, { page: "3" });
		expect(buildTalkListingPage(items, normalized!)).toBeNull();
	});

	test("分類と検索IDを全件へ適用してからページングする", () => {
		const items = Array.from({ length: 70 }, (_, index) =>
			createItem(index + 1, {
				collectionId: index < 35 ? "monthly_talk" : "other",
				collectionLabel: index < 35 ? "月例講演会" : "法話",
			}),
		);
		const normalized = normalizeTalkListingRequest(items, {
			page: "2",
			query: "慈悲",
			collectionId: "monthly_talk",
		});
		const matched = items.slice(0, 35).map((item) => item.id);
		const result = buildTalkListingPage(items, normalized!, matched);

		expect(result?.totalItems).toBe(35);
		expect(result?.items).toHaveLength(5);
		expect(result?.rangeStart).toBe(31);
		expect(result?.rangeEnd).toBe(35);
	});

	test("未知seriesと親collectionの矛盾を拒否しseries単独は親を補う", () => {
		const items = [
			createItem(1, {
				collectionId: "scripture_commentary",
				collectionLabel: "経典解説",
				seriesId: "abhidhamma",
				seriesLabel: "アビダンマ",
			}),
		];
		expect(
			normalizeTalkListingRequest(items, {
				page: "1",
				seriesId: "unknown-series",
			}),
		).toBeNull();
		expect(
			normalizeTalkListingRequest(items, {
				page: "1",
				collectionId: "monthly_talk",
				seriesId: "abhidhamma",
			}),
		).toBeNull();
		expect(
			normalizeTalkListingRequest(items, {
				page: "1",
				seriesId: "abhidhamma",
			})?.conditions,
		).toMatchObject({
			collectionId: "scripture_commentary",
			seriesId: "abhidhamma",
		});
	});

	test("正常な0件検索はpage 1の成功結果にする", () => {
		const items = [createItem(1)];
		const normalized = normalizeTalkListingRequest(items, {
			page: "1",
			query: "一致なし",
		});
		const result = buildTalkListingPage(items, normalized!, []);
		expect(result).toMatchObject({
			totalItems: 0,
			totalPages: 1,
			rangeStart: 0,
			rangeEnd: 0,
			items: [],
		});
	});

	test("queryをtrimして120文字に制限する", () => {
		const normalized = normalizeTalkListingRequest([createItem(1)], {
			page: "1",
			query: `  ${"慈".repeat(121)}  `,
		});
		expect(normalized?.conditions.query).toBe("慈".repeat(120));
	});

	test("年代リンクとページ内セクションは入力順を変えない", () => {
		const items = [
			...Array.from({ length: 31 }, (_, index) => createItem(index + 1)),
			createItem(32, {
				decadeLabel: "2010年代",
				recordedOnSortValue: 1,
			}),
		];
		const normalized = normalizeTalkListingRequest(items, { page: "2" });
		const result = buildTalkListingPage(items, normalized!);
		expect(result?.decadeTargets).toEqual([
			{
				label: "2020年代",
				count: 31,
				page: 1,
				anchorId: "talk-decade-2020",
			},
			{
				label: "2010年代",
				count: 1,
				page: 2,
				anchorId: "talk-decade-2010",
			},
		]);
		expect(
			buildTalkListingSections(result!.items).flatMap((section) =>
				section.items.map((item) => item.id),
			),
		).toEqual(result!.items.map((item) => item.id));
	});
});
