import { describe, expect, test } from "bun:test";
import type { TalkForDisplay } from "../../domain/talk/types";
import {
	buildSearchIndex,
	filterTalksByQuery,
	tokenizeSearchQuery,
} from "./search";
import { buildTalkGalleryTalks } from "./gallery";
import type { Talk } from "../../domain/talk/types";

function createDisplayTalk(
	overrides: Partial<TalkForDisplay> = {},
): TalkForDisplay {
	return {
		id: "TALK-1",
		dvdId: "V-001",
		event: "月例講演会",
		title: "心と病気の関係",
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
				subtitle: "悦びの心を得る",
				themeLabel: "無常",
			}),
		];

		const indexedTalks = buildSearchIndex(talks);
		const result = filterTalksByQuery(indexedTalks, tokenizeSearchQuery("病気 東京"));

		expect(result).toHaveLength(1);
		expect(result[0]?.id).toBe("TALK-1");
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
