import { describe, expect, test } from "bun:test";
import type { TalkForDisplay } from "../../domain/talk/types";
import {
	buildDecadeSections,
	buildThemeSections,
	buildVirtualGalleryData,
} from "./grouping";

function createTalk(
	id: string,
	overrides: Partial<TalkForDisplay> = {},
): TalkForDisplay {
	return {
		id,
		dvdId: id,
		event: "月例講演会",
		title: id,
		subtitle: "",
		venue: "東京",
		speaker: "スマナサーラ",
		duration: "1:00:00",
		language: "日本語",
		audioLink: null,
		attachmentsLink: null,
		youtubeUrl: null,
		thumbnailUrl: null,
		recordedOnRaw: "1995年9月9日",
		recordedOnFormatted: "1995年9月9日(土)",
		recordedOnSortValue: 1,
		decadeLabel: "1990年代",
		themeLabel: "テーマA",
		...overrides,
	};
}

describe("talk grouping helpers", () => {
	test("年代セクションをソートして組み立てる", () => {
		const talks = [
			createTalk("latest-1", {
				decadeLabel: "最新",
				recordedOnSortValue: 20,
			}),
			createTalk("latest-2", {
				decadeLabel: "最新",
				recordedOnSortValue: 10,
			}),
			createTalk("1990-1", {
				decadeLabel: "1990年代",
				recordedOnSortValue: 5,
			}),
			createTalk("unknown", {
				decadeLabel: "年代不明",
				recordedOnSortValue: 0,
			}),
		];

		const sections = buildDecadeSections(talks);

		expect(sections.map((section) => section.label)).toEqual([
			"最新",
			"1990年代",
			"年代不明",
		]);
		expect(sections[0]?.talks.map((talk) => talk.id)).toEqual([
			"latest-1",
			"latest-2",
		]);
	});

	test("テーマセクションは未設定を末尾に回す", () => {
		const talks = [
			createTalk("theme-b", { themeLabel: "テーマB", recordedOnSortValue: 1 }),
			createTalk("unset", {
				themeLabel: "テーマ未設定",
				recordedOnSortValue: 3,
			}),
			createTalk("theme-a", { themeLabel: "テーマA", recordedOnSortValue: 2 }),
		];

		const sections = buildThemeSections(talks);

		expect(sections.map((section) => section.label)).toEqual([
			"テーマA",
			"テーマB",
			"テーマ未設定",
		]);
	});

	test("セクションから仮想化用の行データを作る", () => {
		const sections = [
			{
				label: "1990年代",
				count: 3,
				sortKey: 1,
				talks: [createTalk("1"), createTalk("2"), createTalk("3")],
			},
		];

		const result = buildVirtualGalleryData(sections, 2);

		expect(result.groupCounts).toEqual([2]);
		expect(result.groups[0]?.rows).toHaveLength(2);
		expect(result.flatRows[0]?.talks.map((talk) => talk.id)).toEqual([
			"1",
			"2",
		]);
		expect(result.flatRows[1]?.talks.map((talk) => talk.id)).toEqual(["3"]);
	});
});
