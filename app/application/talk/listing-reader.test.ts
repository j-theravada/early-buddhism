import { describe, expect, test } from "bun:test";
import type { TalkGalleryItem } from "../../domain/talk/types";
import type { TranscriptSearchSnippet } from "./search";
import { createTalkListingReader } from "./listing-reader";

function createItems(count: number): TalkGalleryItem[] {
	return Array.from({ length: count }, (_, index) => ({
		id: `TALK-${index + 1}`,
		dvdId: `V-${index + 1}`,
		collectionId: "monthly_talk",
		collectionLabel: "月例講演会",
		seriesId: "",
		seriesLabel: "",
		title: `法話 ${index + 1}`,
		subtitle: "",
		attachmentsLink: null,
		youtubeUrl: null,
		thumbnailUrl: null,
		recordedOnFormatted: "2024年1月1日",
		recordedOnSortValue: count - index,
		decadeLabel: "2020年代",
		themeLabel: "",
	}));
}

function createSnippet(text: string): TranscriptSearchSnippet {
	return {
		text,
		cueIndex: 1,
		start: 10,
		startLabel: "00:00:10",
	};
}

describe("talk listing reader", () => {
	test("queryなしでは検索依存を呼ばない", async () => {
		let matchCalls = 0;
		let snippetCalls = 0;
		const reader = createTalkListingReader({
			loadItems: async () => createItems(61),
			findMatchingTalkIds: async () => {
				matchCalls += 1;
				return [];
			},
			buildTranscriptSnippets: async () => {
				snippetCalls += 1;
				return new Map();
			},
		});

		const result = await reader({ page: "1", query: "   " });
		expect(result?.items).toHaveLength(30);
		expect(matchCalls).toBe(0);
		expect(snippetCalls).toBe(0);
	});

	test("一致IDは全件で求めて現在ページIDだけのsnippetを要求する", async () => {
		const items = createItems(61);
		const snippetInputs: string[][] = [];
		const reader = createTalkListingReader({
			loadItems: async () => items,
			findMatchingTalkIds: async () => items.map((item) => item.id),
			buildTranscriptSnippets: async (_query, talkIds) => {
				snippetInputs.push([...talkIds]);
				return new Map([
					[talkIds[0]!, [createSnippet("表示対象")]],
					["EXTRA", [createSnippet("除外対象")]],
				]);
			},
		});

		const result = await reader({ page: "2", query: "仏教" });
		expect(snippetInputs).toEqual([items.slice(30, 60).map((item) => item.id)]);
		expect(result?.transcriptSnippetsByTalkId.has("EXTRA")).toBe(false);
	});

	test("正規化queryをTTL内で再利用し期限ちょうどで再計算する", async () => {
		let now = 0;
		let matchCalls = 0;
		const items = createItems(1);
		const reader = createTalkListingReader(
			{
				loadItems: async () => items,
				findMatchingTalkIds: async () => {
					matchCalls += 1;
					return items.map((item) => item.id);
				},
				buildTranscriptSnippets: async () => new Map(),
			},
			{ now: () => now },
		);

		await reader({ page: "1", query: " 慈悲   瞑想 " });
		await reader({ page: "1", query: "慈悲 瞑想" });
		expect(matchCalls).toBe(1);
		now = 5 * 60 * 1000;
		await reader({ page: "1", query: "慈悲 瞑想" });
		expect(matchCalls).toBe(2);
	});

	test("ID cacheを上限内に保ち最古queryを再計算する", async () => {
		let matchCalls = 0;
		const items = createItems(1);
		const reader = createTalkListingReader(
			{
				loadItems: async () => items,
				findMatchingTalkIds: async () => {
					matchCalls += 1;
					return items.map((item) => item.id);
				},
				buildTranscriptSnippets: async () => new Map(),
			},
			{ maxSearchCacheEntries: 2 },
		);
		for (const query of ["q1", "q2", "q3", "q1"]) {
			await reader({ page: "1", query });
		}
		expect(matchCalls).toBe(4);
	});

	test("0件ではsnippetを呼ばず依存エラーを隠さない", async () => {
		let snippetCalls = 0;
		const emptyReader = createTalkListingReader({
			loadItems: async () => createItems(1),
			findMatchingTalkIds: async () => [],
			buildTranscriptSnippets: async () => {
				snippetCalls += 1;
				return new Map();
			},
		});
		expect(await emptyReader({ page: "1", query: "不存在" })).toMatchObject({
			totalItems: 0,
		});
		expect(snippetCalls).toBe(0);

		const failingReader = createTalkListingReader({
			loadItems: async () => createItems(1),
			findMatchingTalkIds: async () => {
				throw new Error("search failed");
			},
			buildTranscriptSnippets: async () => new Map(),
		});
		await expect(failingReader({ page: "1", query: "慈悲" })).rejects.toThrow(
			"search failed",
		);
	});
});
