import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import {
	collectTranscriptDownloadTargets,
	normalizeTranscriptContent,
	writeGeneratedTranscripts,
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

describe("writeGeneratedTranscripts", () => {
	test("取得に失敗したSRTは既存の生成ファイルを残す", async () => {
		const outDir = await mkdtemp(join(tmpdir(), "gakurin-transcripts-"));
		const existingSrt = `1
00:00:00,000 --> 00:00:02,000
既存の文字起こし`;

		try {
			await writeFile(join(outDir, "TALK-1.srt"), `${existingSrt}\n`, "utf8");

			const result = await writeGeneratedTranscripts(
				outDir,
				[
					{
						id: "TALK-1",
						srtLink: "https://example.com/talk-1.srt",
					},
				],
				{
					fetchTranscript: async () => {
						throw new Error("503 Service Unavailable");
					},
					warn: () => {},
				},
			);

			expect(result).toEqual({
				writtenCount: 0,
				retainedCount: 1,
			});
			expect(await readFile(join(outDir, "TALK-1.srt"), "utf8")).toBe(
				`${existingSrt}\n`,
			);
		} finally {
			await rm(outDir, { recursive: true, force: true });
		}
	});
});
