import { describe, expect, test } from "bun:test";
import {
	collectTranscriptDownloadTargets,
	normalizeTranscriptContent,
} from "./generation";

describe("collectTranscriptDownloadTargets", () => {
	test("SRTリンクがあるトークだけをダウンロード対象にする", () => {
		const result = collectTranscriptDownloadTargets([
			{
				id: "TALK-1",
				srtLink: "https://drive.google.com/file/d/FILE_ID/view?usp=sharing",
			},
			{
				id: "TALK-2",
				srtLink: null,
			},
		]);

		expect(result).toEqual([
			{
				talkId: "TALK-1",
				sourceUrl:
					"https://drive.google.com/file/d/FILE_ID/view?usp=sharing",
				downloadUrl: "https://drive.google.com/uc?export=download&id=FILE_ID",
			},
		]);
	});
});

describe("normalizeTranscriptContent", () => {
	test("妥当なSRT本文をそのまま返す", () => {
		const srt = `1
00:00:00,000 --> 00:00:02,000
最初の行`;

		expect(normalizeTranscriptContent("TALK-1", srt)).toBe(srt);
	});

	test("SRTとして解釈できない本文は例外にする", () => {
		expect(() =>
			normalizeTranscriptContent("TALK-1", "<html>invalid</html>"),
		).toThrow("TALK-1");
	});
});
