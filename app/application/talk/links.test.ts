import { describe, expect, test } from "bun:test";
import {
	buildTalkArchiveHref,
	buildTalkDetailHref,
	buildTalksHref,
	buildTranscriptCueHref,
	getFirstSearchParam,
	parseTalkDetailGalleryPage,
	parseTranscriptCueIndex,
	TALK_DETAIL_GALLERY_COLLECTION_PARAM,
	TALK_DETAIL_GALLERY_QUERY_PARAM,
	TALK_DETAIL_GALLERY_SERIES_PARAM,
	TALK_DETAIL_TRANSCRIPT_CUE_PARAM,
	TALK_DETAIL_TRANSCRIPT_QUERY_PARAM,
	TALK_GALLERY_COLLECTION_PARAM,
	TALK_GALLERY_QUERY_PARAM,
	TALK_GALLERY_SEARCH_FIELDS_PARAM,
} from "./links";

describe("talk link helpers", () => {
	test("全法話アーカイブへのページリンクを組み立てる", () => {
		expect(buildTalkArchiveHref(1)).toBe("/talks/archive/1");
		expect(buildTalkArchiveHref(10)).toBe("/talks/archive/10");
	});

	test("講演一覧への検索リンクを組み立てる", () => {
		expect(buildTalksHref({ page: 1 })).toBe("/talks");
		expect(buildTalksHref(" 預流果 ")).toBe(
			`/talks?${TALK_GALLERY_QUERY_PARAM}=%E9%A0%90%E6%B5%81%E6%9E%9C`,
		);
		expect(
			buildTalksHref({
				page: 3,
				query: "慈悲",
				collectionId: "scripture_commentary",
				seriesId: "abhidhamma",
			}),
		).toBe(
			"/talks/page/3?query=%E6%85%88%E6%82%B2&collection=scripture_commentary&series=abhidhamma",
		);
		expect(buildTalksHref({ collectionId: "monthly_talk" })).toBe(
			`/talks?${TALK_GALLERY_COLLECTION_PARAM}=monthly_talk`,
		);
		expect(buildTalksHref("   ")).toBe("/talks");
		expect(
			buildTalksHref({
				query: "慈悲",
				searchFields: ["title", "transcript"],
			}),
		).toBe(
			`/talks?${TALK_GALLERY_QUERY_PARAM}=%E6%85%88%E6%82%B2&${TALK_GALLERY_SEARCH_FIELDS_PARAM}=title&${TALK_GALLERY_SEARCH_FIELDS_PARAM}=transcript`,
		);
	});

	test("講演詳細への戻り検索条件付きリンクを組み立てる", () => {
		expect(buildTalkDetailHref("TALK V-001", { query: "慈悲" })).toBe(
			`/talks/TALK%20V-001?${TALK_DETAIL_GALLERY_QUERY_PARAM}=%E6%85%88%E6%82%B2`,
		);
		expect(
			buildTalkDetailHref("TALK V-001", {
				page: 3,
				query: "慈悲",
				collectionId: "scripture_commentary",
				seriesId: "abhidhamma",
			}),
		).toBe(
			[
				"/talks/TALK%20V-001?",
				`${TALK_DETAIL_GALLERY_QUERY_PARAM}=%E6%85%88%E6%82%B2`,
				`&${TALK_DETAIL_GALLERY_COLLECTION_PARAM}=scripture_commentary`,
				`&${TALK_DETAIL_GALLERY_SERIES_PARAM}=abhidhamma`,
				"&galleryPage=3",
			].join(""),
		);
		expect(
			buildTalkDetailHref("TALK-V-001", {
				collectionId: "monthly_talk",
			}),
		).toBe(
			`/talks/TALK-V-001?${TALK_DETAIL_GALLERY_COLLECTION_PARAM}=monthly_talk`,
		);
		expect(buildTalkDetailHref("TALK-V-001")).toBe("/talks/TALK-V-001");
		expect(
			buildTalkDetailHref("TALK-V-001", {
				query: "慈悲",
				searchFields: ["title", "transcript"],
			}),
		).toBe(
			"/talks/TALK-V-001?galleryQuery=%E6%85%88%E6%82%B2&galleryFields=title&galleryFields=transcript",
		);
	});

	test("文字起こし cue へのリンクを組み立てる", () => {
		expect(
			buildTranscriptCueHref("TALK-V-001", 12, {
				page: 3,
				query: "預流果",
				collectionId: "scripture_commentary",
				seriesId: "abhidhamma",
			}),
		).toBe(
			[
				"/talks/TALK-V-001?",
				`${TALK_DETAIL_TRANSCRIPT_QUERY_PARAM}=%E9%A0%90%E6%B5%81%E6%9E%9C`,
				`&${TALK_DETAIL_GALLERY_QUERY_PARAM}=%E9%A0%90%E6%B5%81%E6%9E%9C`,
				`&${TALK_DETAIL_GALLERY_COLLECTION_PARAM}=scripture_commentary`,
				`&${TALK_DETAIL_GALLERY_SERIES_PARAM}=abhidhamma`,
				"&galleryPage=3",
				`&${TALK_DETAIL_TRANSCRIPT_CUE_PARAM}=12`,
				"#transcript-cue-12",
			].join(""),
		);
	});

	test("詳細画面のギャラリーページ番号を安全に読む", () => {
		expect(parseTalkDetailGalleryPage("3")).toBe(3);
		for (const value of ["", "0", "03", "2.0", "x"]) {
			expect(parseTalkDetailGalleryPage(value)).toBe(1);
		}
	});

	test("searchParams の単一値と cue index を安全に読む", () => {
		expect(getFirstSearchParam(["最初", "二番目"])).toBe("最初");
		expect(getFirstSearchParam(undefined)).toBe("");
		expect(parseTranscriptCueIndex("7")).toBe(7);
		expect(parseTranscriptCueIndex("0")).toBe(0);
		expect(parseTranscriptCueIndex("abc")).toBeNull();
	});
});
