import { describe, expect, test } from "bun:test";
import type { Talk } from "../../domain/talk/types";
import {
	buildTranscriptAwareSearchData,
	hasTranscriptAwareSearchQuery,
	searchTranscriptAwareTalks,
} from "./transcript-search";

function createTalk(overrides: Partial<Talk> = {}): Talk {
	return {
		id: "TALK-V-001",
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
		title: "東京の講演",
		description: "",
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

describe("transcript-aware talk search", () => {
	test("講演メタデータと正規化した文字起こし ID を合わせて検索する", () => {
		const searchData = buildTranscriptAwareSearchData(
			[
				createTalk(),
				createTalk({
					id: "TALK-V-002",
					dvdId: "V-002",
					title: "大阪の講演",
					recordedOnDate: new Date("1994-09-09T00:00:00.000Z"),
				}),
			],
			[
				{
					talkId: "talk—v—001",
					text: "預流果の説明",
					cues: [
						{
							index: 7,
							start: 12,
							end: 18,
							startLabel: "00:00:12",
							endLabel: "00:00:18",
							text: "ここで預流果について説明します。",
						},
					],
				},
			],
		);

		const response = searchTranscriptAwareTalks(searchData, "東京 預流果");

		expect(response.talkIds).toEqual(["TALK-V-001"]);
		expect(response.results).toEqual([
			{
				talkId: "TALK-V-001",
				transcriptSnippets: [
					{
						text: "ここで預流果について説明します。",
						cueIndex: 7,
						start: 12,
						startLabel: "00:00:12",
					},
				],
			},
		]);
	});

	test("文字起こしに一致しないメタデータ検索結果も ID として返す", () => {
		const searchData = buildTranscriptAwareSearchData(
			[
				createTalk(),
				createTalk({
					id: "TALK-V-002",
					dvdId: "V-002",
					title: "大阪の講演",
					recordedOnDate: new Date("1994-09-09T00:00:00.000Z"),
				}),
			],
			[],
		);

		const response = searchTranscriptAwareTalks(searchData, "大阪");

		expect(response).toEqual({
			talkIds: ["TALK-V-002"],
			results: [
				{
					talkId: "TALK-V-002",
					transcriptSnippets: [],
				},
			],
		});
	});

	test("空のクエリはデータ読み込み前に空結果として判定できる", () => {
		const searchData = buildTranscriptAwareSearchData([createTalk()], []);

		expect(hasTranscriptAwareSearchQuery("   ")).toBe(false);
		expect(hasTranscriptAwareSearchQuery("無常")).toBe(true);
		expect(searchTranscriptAwareTalks(searchData, "   ")).toEqual({
			talkIds: [],
			results: [],
		});
	});
});
