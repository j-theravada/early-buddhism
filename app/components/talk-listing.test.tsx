import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { TalkListingPage } from "../application/talk/listing";
import { ALL_SEARCH_FIELDS } from "../application/talk/search";
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
			searchFields: [...ALL_SEARCH_FIELDS],
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
		expect(html).toContain('name="fields"');
		expect(html).toContain("検索対象");
		expect(html).toMatch(
			/<details[^>]*>\s*<summary[^>]*>\s*<span>検索・絞り込み<\/span>/,
		);
		expect(html).not.toContain('<details open="">');
		expect(html).toContain("条件あり");
		const noConditionsHtml = renderToStaticMarkup(
			<TalkListing
				listing={createListing({
					conditions: { query: "", collectionId: "", seriesId: "" },
				})}
			/>,
		);
		expect(noConditionsHtml).toContain("分類・シリーズ");
		expect(html).toContain('type="hidden" name="collection"');
		expect(html).toContain("検索");
		expect(html).toContain("w-full min-w-0");
		expect(html).toContain("min-w-20");
		expect(html).toContain("sm:min-w-28");
		expect(html).not.toContain("home-outline-button");
		expect(html).toContain("全65件中 31〜60件");
		expect(html).toContain(
			'href="/talks/page/3?query=%E4%BB%8F%E6%95%99&amp;collection=monthly_talk"',
		);
		expect(html).toContain("galleryPage=2");
	});

	test("検索対象にはタイトル、解説、文字起こしだけを表示する", () => {
		const html = renderToStaticMarkup(
			<TalkListing listing={createListing()} />,
		);

		expect(html).toMatch(
			/<input type="checkbox" name="fields" value="title"\/>/,
		);
		expect(html).toMatch(
			/<input type="checkbox" name="fields" value="description"\/>/,
		);
		expect(html).toMatch(
			/<input type="checkbox" name="fields" value="transcript"\/>/,
		);
		expect(html).not.toContain('value="speaker"');
		expect(html).not.toContain('value="classification"');
		expect(html).not.toContain('value="theme"');
	});

	test("検索対象のチェック状態をフォームに反映する", () => {
		const html = renderToStaticMarkup(
			<TalkListing
				listing={createListing({
					conditions: {
						query: "仏教",
						collectionId: "",
						seriesId: "",
						searchFields: ["title", "transcript"],
					},
				})}
			/>,
		);

		expect(html).toMatch(
			/<input type="checkbox" name="fields" checked="" value="title"\/>/,
		);
		expect(html).toMatch(
			/<input type="checkbox" name="fields" checked="" value="transcript"\/>/,
		);
		expect(html).not.toMatch(
			/<input type="checkbox" name="fields" checked="" value="speaker"\/>/,
		);
		expect(html).toContain("検索対象: タイトル・文字起こし");
	});

	test("年代リンクと対象セクションのアンカーを通常リンクで結ぶ", () => {
		const html = renderToStaticMarkup(
			<TalkListing
				listing={createListing({
					conditions: {
						query: "",
						collectionId: "",
						seriesId: "",
						searchFields: [...ALL_SEARCH_FIELDS],
					},
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

	test("検索時の年代リンクに現在の検索条件を引き継ぐ", () => {
		const html = renderToStaticMarkup(
			<TalkListing
				listing={createListing({
					conditions: {
						query: "仏教",
						collectionId: "scripture_commentary",
						seriesId: "abhidhamma",
						searchFields: ["title", "transcript"],
					},
					decadeTargets: [
						{
							label: "2000年代",
							count: 31,
							page: 2,
							anchorId: "talk-decade-2000",
						},
						{
							label: "2010年代",
							count: 1,
							page: 3,
							anchorId: "talk-decade-2010",
						},
					],
				})}
			/>,
		);

		expect(html).toContain(
			'href="/talks/page/2?query=%E4%BB%8F%E6%95%99&amp;collection=scripture_commentary&amp;series=abhidhamma&amp;fields=title&amp;fields=transcript#talk-decade-2000"',
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
