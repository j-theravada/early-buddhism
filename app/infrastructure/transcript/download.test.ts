import { describe, expect, test } from "bun:test";
import { buildTranscriptDownloadUrl } from "./download";

describe("buildTranscriptDownloadUrl", () => {
	test("Google Drive共有URLをダウンロードURLへ変換する", () => {
		expect(
			buildTranscriptDownloadUrl(
				"https://drive.google.com/file/d/FILE_ID/view?usp=sharing",
			),
		).toBe("https://drive.google.com/uc?export=download&id=FILE_ID");
	});

	test("Google Drive以外のURLはそのまま返す", () => {
		expect(buildTranscriptDownloadUrl("https://example.com/sample.srt")).toBe(
			"https://example.com/sample.srt",
		);
	});
});
