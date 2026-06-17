import { describe, expect, test } from "bun:test";
import {
	buildTalkDetailHref,
	buildTalksHref,
	buildTranscriptCueHref,
	getFirstSearchParam,
	parseTranscriptCueIndex,
	TALK_DETAIL_GALLERY_QUERY_PARAM,
	TALK_DETAIL_TRANSCRIPT_CUE_PARAM,
	TALK_DETAIL_TRANSCRIPT_QUERY_PARAM,
	TALK_GALLERY_QUERY_PARAM,
} from "./links";

describe("talk link helpers", () => {
	test("講演一覧への検索リンクを組み立てる", () => {
		expect(buildTalksHref(" 預流果 ")).toBe(
			`/talks?${TALK_GALLERY_QUERY_PARAM}=%E9%A0%90%E6%B5%81%E6%9E%9C`,
		);
		expect(buildTalksHref("   ")).toBe("/talks");
	});

	test("講演詳細への戻り検索条件付きリンクを組み立てる", () => {
		expect(buildTalkDetailHref("TALK V-001", "慈悲")).toBe(
			`/talks/TALK%20V-001?${TALK_DETAIL_GALLERY_QUERY_PARAM}=%E6%85%88%E6%82%B2`,
		);
		expect(buildTalkDetailHref("TALK-V-001")).toBe("/talks/TALK-V-001");
	});

	test("文字起こし cue へのリンクを組み立てる", () => {
		expect(buildTranscriptCueHref("TALK-V-001", 12, "預流果")).toBe(
			[
				"/talks/TALK-V-001?",
				`${TALK_DETAIL_TRANSCRIPT_QUERY_PARAM}=%E9%A0%90%E6%B5%81%E6%9E%9C`,
				`&${TALK_DETAIL_GALLERY_QUERY_PARAM}=%E9%A0%90%E6%B5%81%E6%9E%9C`,
				`&${TALK_DETAIL_TRANSCRIPT_CUE_PARAM}=12`,
				"#transcript-cue-12",
			].join(""),
		);
	});

	test("searchParams の単一値と cue index を安全に読む", () => {
		expect(getFirstSearchParam(["最初", "二番目"])).toBe("最初");
		expect(getFirstSearchParam(undefined)).toBe("");
		expect(parseTranscriptCueIndex("7")).toBe(7);
		expect(parseTranscriptCueIndex("0")).toBeNull();
		expect(parseTranscriptCueIndex("abc")).toBeNull();
	});
});
