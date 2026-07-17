import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { TalkListingPage } from "../application/talk/listing";
import type { TalkGalleryItem } from "../domain/talk/types";
import TalkListing from "./talk-listing";
import { buildVisibleTalkListingPages } from "./talk-listing-pagination";

function createTalk(id: string, decadeLabel = "2010年代"): TalkGalleryItem {
	return {
		id,
		dvdId: id,
		collectionId: "monthly_talk",
		collectionLabel: "月例講演",
		seriesId: "",
		seriesLabel: "",
		title: `法話 ${id}`,
		subtitle: "仏教の教え",
		attachmentsLink: null,
		youtubeUrl: null,
		thumbnailUrl: null,
		recordedOnFormatted: "2018年1月1日",
		recordedOnSortValue: 20180101,
		decadeLabel,
		themeLabel: "仏教",
	};
}

function createListing(
	overrides: Partial<TalkListingPage> = {},
): TalkListingPage {
	return {
		conditions: {
			query: "仏教",
			collectionId: "monthly_talk",
			seriesId: "",
		},
		page: 2,
		pageSize: 30,
		totalItems: 65,
		totalPages: 3,
		rangeStart: 31,
		rangeEnd: 60,
		previousPage: 1,
		nextPage: 3,
		items: [createTalk("TALK-31")],
		transcriptSnippetsByTalkId: new Map(),
		collectionOptions: [{ id: "monthly_talk", label: "月例講演" }],
		seriesOptions: [],
		decadeTargets: [],
		...overrides,
	};
}

describe("TalkListing", () => {
	test("検索フォーム、件数、通常のページ・詳細リンクを初期HTMLに含める", () => {
		const html = renderToStaticMarkup(
			<TalkListing listing={createListing()} />,
		);

		expect(html).toContain('action="/talks"');
		expect(html).toContain('method="get"');
		expect(html).toContain('name="query"');
		expect(html).toContain('type="hidden" name="collection"');
		expect(html).toContain("検索");
		expect(html).toContain("w-full min-w-0");
		expect(html).toContain("min-w-20");
		expect(html).toContain("sm:min-w-48");
		expect(html).not.toContain("home-outline-button");
		expect(html).toContain("全65件中 31〜60件");
		expect(html).toContain(
			'href="/talks/page/3?query=%E4%BB%8F%E6%95%99&amp;collection=monthly_talk"',
		);
		expect(html).toContain("galleryPage=2");
	});

	test("年代リンクと対象セクションのアンカーを通常リンクで結ぶ", () => {
		const html = renderToStaticMarkup(
			<TalkListing
				listing={createListing({
					conditions: { query: "", collectionId: "", seriesId: "" },
					items: [
						createTalk("TALK-31", "2010年代"),
						createTalk("TALK-32", "2000年代"),
					],
					decadeTargets: [
						{
							label: "2010年代",
							count: 30,
							page: 2,
							anchorId: "talk-decade-2010",
						},
						{
							label: "2000年代",
							count: 35,
							page: 3,
							anchorId: "talk-decade-2000",
						},
					],
				})}
			/>,
		);

		expect(html).toContain('href="/talks/page/2#talk-decade-2010"');
		expect(html).toContain(
			'class="scroll-mt-72 lg:scroll-mt-80" id="talk-decade-2010"',
		);
	});

	test("1ページだけの結果にはページナビゲーションを出さない", () => {
		const html = renderToStaticMarkup(
			<TalkListing
				listing={createListing({
					page: 1,
					totalItems: 1,
					totalPages: 1,
					rangeStart: 1,
					rangeEnd: 1,
					previousPage: null,
					nextPage: null,
				})}
			/>,
		);

		expect(html).not.toContain('aria-label="動画一覧のページ"');
	});

	test("0件でも検索コントロールを残して件数を表示する", () => {
		const html = renderToStaticMarkup(
			<TalkListing
				listing={createListing({
					page: 1,
					totalItems: 0,
					totalPages: 1,
					rangeStart: 0,
					rangeEnd: 0,
					previousPage: null,
					nextPage: null,
					items: [],
				})}
			/>,
		);

		expect(html).toContain('action="/talks"');
		expect(html).toContain('name="query"');
		expect(html).toContain("全0件");
		expect(html).toContain(
			"検索条件に一致するデータが見つかりませんでした。条件を変えてお試しください。",
		);
	});
});

test("現在ページの前後と両端だけを省略記号つきで返す", () => {
	expect(buildVisibleTalkListingPages(16, 31)).toEqual([
		1,
		"ellipsis",
		15,
		16,
		17,
		"ellipsis",
		31,
	]);
});
