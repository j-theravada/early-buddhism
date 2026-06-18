import { describe, expect, test } from "bun:test";
import type { Talk, TalkForDisplay } from "../../domain/talk/types";
import { buildTalkGalleryTalks } from "./gallery";
import {
	buildSearchIndex,
	buildSearchSnippets,
	buildTranscriptSearchSnippets,
	filterTalksByQuery,
	tokenizeSearchQuery,
} from "./search";

function createDisplayTalk(
	overrides: Partial<TalkForDisplay> = {},
): TalkForDisplay {
	return {
		id: "TALK-1",
		kind: "talk",
		collectionId: "monthly_talk",
		collectionLabel: "月例講演会",
		seriesId: "",
		seriesLabel: "",
		dvdId: "V-001",
		event: "月例講演会",
		title: "心と病気の関係",
		description: "心のあり方が病気を作り出す。",
		subtitle: "心のあり方が病気を作り出す。",
		venue: "東京",
		speaker: "アルボムッレ・スマナサーラ",
		duration: "1:42:14",
		language: "日本語",
		audioLink: null,
		attachmentsLink: null,
		youtubeUrl: null,
		thumbnailUrl: null,
		recordedOnRaw: "1995年9月9日",
		recordedOnFormatted: "1995年9月9日(土)",
		recordedOnSortValue: 810604800000,
		decadeLabel: "1990年代",
		themeLabel: "心と病気",
		...overrides,
	};
}

function createTalk(overrides: Partial<Talk> = {}): Talk {
	return {
		id: "TALK-1",
		kind: "talk",
		collectionId: "monthly_talk",
		collectionLabel: "月例講演会",
		seriesId: "",
		seriesLabel: "",
		dvdId: "V-001",
		folder: "",
		event: "月例講演会",
		venue: "東京",
		recordedOn: "1995年9月9日",
		recordedOnDate: new Date("1995-09-09T00:00:00.000Z"),
		duration: "1:42:14",
		title: "心と病気の関係",
		description: "心のあり方が病気を作り出す。",
		speaker: "アルボムッレ・スマナサーラ",
		language: "日本語",
		format: "ISO",
		audioLink: null,
		attachmentsLink: null,
		slideLinks: [],
		youtubeLink: null,
		srtLink: null,
		...overrides,
	};
}

describe("talk search helpers", () => {
	test("検索クエリを正規化してトークを絞り込む", () => {
		const talks = [
			createDisplayTalk(),
			createDisplayTalk({
				id: "TALK-2",
				title: "無常観",
				description: "",
				subtitle: "悦びの心を得る",
				venue: "大阪",
				themeLabel: "無常",
			}),
		];

		const indexedTalks = buildSearchIndex(talks);
		const result = filterTalksByQuery(
			indexedTalks,
			tokenizeSearchQuery("病気 東京"),
		);

		expect(result).toHaveLength(1);
		expect(result[0]?.id).toBe("TALK-1");
	});

	test("追加の文字起こしテキストも検索対象に含める", () => {
		const talks = [
			createDisplayTalk({
				id: "TALK-1",
				title: "東京の瞑想会",
				subtitle: "",
			}),
			createDisplayTalk({
				id: "TALK-2",
				title: "大阪の講演会",
				subtitle: "",
			}),
		];
		const extraSearchTextByTalkId = new Map([
			["TALK-1", "ヴィパッサナー実践の説明"],
			["TALK-2", "慈悲の瞑想の説明"],
		]);

		const indexedTalks = buildSearchIndex(talks, { extraSearchTextByTalkId });
		const result = filterTalksByQuery(
			indexedTalks,
			tokenizeSearchQuery("東京 ヴィパッサナー"),
		);

		expect(result.map((talk) => talk.id)).toEqual(["TALK-1"]);
	});

	test("コレクション名を検索対象に含める", () => {
		const talks = [
			createDisplayTalk({
				id: "TALK-1",
				collectionId: "scripture_commentary",
				collectionLabel: "経典解説",
				seriesId: "dhammapada",
				seriesLabel: "ダンマパダ",
				title: "第一章",
				subtitle: "",
			}),
			createDisplayTalk({
				id: "TALK-2",
				collectionId: "monthly_talk",
				collectionLabel: "月例講演会",
				title: "心と病気の関係",
				subtitle: "",
			}),
		];

		const indexedTalks = buildSearchIndex(talks);
		const result = filterTalksByQuery(
			indexedTalks,
			tokenizeSearchQuery("ダンマパダ"),
		);

		expect(result.map((talk) => talk.id)).toEqual(["TALK-1"]);
	});

	test("シリーズ名を検索対象に含める", () => {
		const talks = [
			createDisplayTalk({
				id: "TALK-1",
				collectionId: "scripture_commentary",
				collectionLabel: "経典解説",
				seriesId: "abhidhamma",
				seriesLabel: "アビダンマ",
				title: "第一講",
				subtitle: "",
			}),
			createDisplayTalk({
				id: "TALK-2",
				title: "心と病気の関係",
				subtitle: "",
			}),
		];

		const indexedTalks = buildSearchIndex(talks);
		const result = filterTalksByQuery(
			indexedTalks,
			tokenizeSearchQuery("アビダンマ"),
		);

		expect(result.map((talk) => talk.id)).toEqual(["TALK-1"]);
	});

	test("文字起こしの一致箇所からスニペットを作る", () => {
		const transcriptText =
			"これは前置きです。心を落ち着けてからヴィパッサナー実践に入ります。終わりの説明です。";

		const snippets = buildSearchSnippets(
			transcriptText,
			tokenizeSearchQuery("ヴィパッサナー"),
			{ contextLength: 8, maxSnippets: 1 },
		);

		expect(snippets).toEqual([
			"…を落ち着けてからヴィパッサナー実践に入ります。…",
		]);
	});

	test("文字起こしに一致しない語はスニペットを返さない", () => {
		const snippets = buildSearchSnippets(
			"これは前置きです。",
			tokenizeSearchQuery("預流果"),
		);

		expect(snippets).toEqual([]);
	});

	test("文字起こしスニペットに遷移先cue情報を含める", () => {
		const snippets = buildTranscriptSearchSnippets(
			[
				{
					index: 12,
					start: 34,
					end: 40,
					startLabel: "00:00:34",
					endLabel: "00:00:40",
					text: "ここで預流果について説明します。",
				},
			],
			tokenizeSearchQuery("預流果"),
		);

		expect(snippets).toEqual([
			{
				text: "ここで預流果について説明します。",
				cueIndex: 12,
				start: 34,
				startLabel: "00:00:34",
			},
		]);
	});

	test("ギャラリー表示用トークを日付降順で並べる", () => {
		const talks = [
			createTalk({
				id: "TALK-OLD",
				recordedOnDate: new Date("1995-09-09T00:00:00.000Z"),
			}),
			createTalk({
				id: "TALK-NEW",
				recordedOnDate: new Date("1996-09-09T00:00:00.000Z"),
			}),
		];

		const result = buildTalkGalleryTalks(talks);

		expect(result.map((talk) => talk.id)).toEqual(["TALK-NEW", "TALK-OLD"]);
	});
});
