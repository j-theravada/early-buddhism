import { describe, expect, test } from "bun:test";
import {
	buildTalkSearchApiUrl,
	parseTalkSearchApiResponse,
} from "./search-api";

describe("talk search API helpers", () => {
	test("検索 API URL にクエリをエンコードする", () => {
		const query = "預流果 東京";

		expect(buildTalkSearchApiUrl(query)).toBe(
			`/api/talk-search?query=${encodeURIComponent(query)}`,
		);
	});

	test("検索 API レスポンスから ID と文字起こしスニペットを取り出す", () => {
		const parsed = parseTalkSearchApiResponse({
			talkIds: ["TALK-1", 123, "TALK-2"],
			results: [
				{
					talkId: "TALK-1",
					transcriptSnippets: [
						{
							text: "ここで預流果について説明します。",
							cueIndex: 7,
							start: 12,
							startLabel: "00:00:12",
						},
						{
							text: "cueIndex が不正なスニペット",
							cueIndex: Number.NaN,
						},
					],
				},
				{
					talkId: "TALK-2",
					transcriptSnippets: [],
				},
				{
					talkId: 999,
					transcriptSnippets: [
						{
							text: "talkId が不正な結果",
							cueIndex: 1,
						},
					],
				},
			],
		});

		expect([...parsed.talkIds]).toEqual(["TALK-1", "TALK-2"]);
		expect(parsed.transcriptSnippetsByTalkId.get("TALK-1")).toEqual([
			{
				text: "ここで預流果について説明します。",
				cueIndex: 7,
				start: 12,
				startLabel: "00:00:12",
			},
		]);
		expect(parsed.transcriptSnippetsByTalkId.has("TALK-2")).toBe(false);
	});

	test("壊れた検索 API レスポンスは空として扱う", () => {
		const parsed = parseTalkSearchApiResponse(null);

		expect([...parsed.talkIds]).toEqual([]);
		expect([...parsed.transcriptSnippetsByTalkId]).toEqual([]);
	});
});
