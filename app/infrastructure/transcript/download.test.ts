import { describe, expect, test } from "bun:test";
import {
	buildTranscriptDownloadUrl,
	extractGoogleDriveFileId,
} from "./download";

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

	test("Google Drive共有URLから更新対象のfile IDを取り出す", () => {
		expect(
			extractGoogleDriveFileId(
				"https://drive.google.com/file/d/FILE_ID/view?usp=sharing",
			),
		).toBe("FILE_ID");
		expect(
			extractGoogleDriveFileId(
				"https://drive.google.com/open?id=DIRECT_FILE_ID",
			),
		).toBe("DIRECT_FILE_ID");
		expect(extractGoogleDriveFileId("https://example.com/file.srt")).toBeNull();
	});
});
