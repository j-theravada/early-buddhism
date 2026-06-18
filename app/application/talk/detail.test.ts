import { describe, expect, test } from "bun:test";
import type { Talk } from "../../domain/talk/types";
import { buildTalkDetailPageData, buildTalkMetadata } from "./detail";

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
		audioLink: "https://example.com/audio.mp3",
		attachmentsLink: "https://example.com/notes.pdf",
		slideLinks: ["https://docs.google.com/presentation/d/slide-1/edit"],
		youtubeLink: "https://youtu.be/ZZYaasluSAA?si=test",
		srtLink: null,
		...overrides,
	};
}

describe("talk detail application helpers", () => {
	test("metadata用データを組み立てる", () => {
		const talk = createTalk();

		const result = buildTalkMetadata(talk);

		expect(result.title).toBe("心と病気の関係");
		expect(result.description).toBe(
			"病気は決して肉体だけの問題ではない。心のあり方が病気を作り出す。",
		);
		expect(result.thumbnailUrl).toBe(
			"https://img.youtube.com/vi/ZZYaasluSAA/hqdefault.jpg",
		);
	});

	test("詳細ページ用データを組み立てる", () => {
		const talk = createTalk();

		const result = buildTalkDetailPageData(talk);

		expect(result.talk.title).toBe("心と病気の関係");
		expect(result.detailRows.map((row) => row.label)).toEqual([
			"DVD番号",
			"コレクション",
			"タイトル",
			"行事名",
			"収録場所",
			"講師",
			"収録時間",
			"言語",
			"収録日",
		]);
		expect(result.resourceLinks.map((link) => link.label)).toEqual([
			"音源を聞く",
			"スライドを見る",
			"添付データ",
		]);
		expect(result.videoJsonLd?.description).toBe(
			"病気は決して肉体だけの問題ではない。心のあり方が病気を作り出す。",
		);
	});

	test("シリーズがある詳細ページではシリーズ行を出す", () => {
		const talk = createTalk({
			collectionId: "scripture_commentary",
			collectionLabel: "経典解説",
			seriesId: "abhidhamma",
			seriesLabel: "アビダンマ",
		});

		const result = buildTalkDetailPageData(talk);

		expect(result.detailRows.map((row) => row.label)).toContain("シリーズ");
	});
});
