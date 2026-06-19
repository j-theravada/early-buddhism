import { describe, expect, test } from "bun:test";
import { SUMANASARA_JA_NAME } from "../teacher/sumanasara";
import { transformTalkToDisplay } from "./display";
import type { Talk } from "./types";

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
		description:
			"病気は決して肉体だけの問題ではない。心のあり方が病気を作り出す。",
		speaker: "アルボムッレ・スマナサーラ",
		language: "日本語",
		format: "ISO",
		audioLink: null,
		attachmentsLink: null,
		slideLinks: [],
		youtubeLink: "https://youtu.be/ZZYaasluSAA?si=test",
		srtLink: null,
		...overrides,
	};
}

describe("transformTalkToDisplay", () => {
	test("表示用データに必要な派生値を組み立てる", () => {
		const talk = createTalk();

		const result = transformTalkToDisplay(talk, 0);

		expect(result.title).toBe("心と病気の関係");
		expect(result.subtitle).toBe(
			"病気は決して肉体だけの問題ではない。心のあり方が病気を作り出す。",
		);
		expect(result.recordedOnRaw).toBe("1995年9月9日");
		expect(result.collectionLabel).toBe("月例講演会");
		expect(result.seriesLabel).toBe("");
		expect(result.decadeLabel).toBe("1990年代");
		expect(result.themeLabel).toBe(
			"病気は決して肉体だけの問題ではない。心のあり方が病気を作り出す。",
		);
		expect(result.speaker).toBe(SUMANASARA_JA_NAME);
		expect(result.youtubeUrl).toBe("https://youtu.be/ZZYaasluSAA?si=test");
		expect(result.thumbnailUrl).toBe(
			"https://img.youtube.com/vi/ZZYaasluSAA/hqdefault.jpg",
		);
	});

	test("descriptionとtitleが同じときsubtitleを空にする", () => {
		const talk = createTalk({ description: "心と病気の関係" });

		const result = transformTalkToDisplay(talk, 0);

		expect(result.subtitle).toBe("");
		expect(result.themeLabel).toBe("心と病気の関係");
	});
});
