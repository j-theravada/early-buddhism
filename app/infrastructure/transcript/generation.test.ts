import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import {
	collectTranscriptDownloadTargets,
	normalizeTranscriptContent,
	selectTranscriptSourceTalks,
	writeGeneratedTranscriptSearchDocuments,
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
				sourceUrl: "https://drive.google.com/file/d/FILE_ID/view?usp=sharing",
				downloadUrl: "https://drive.google.com/uc?export=download&id=FILE_ID",
			},
		]);
	});
});

describe("selectTranscriptSourceTalks", () => {
	test("コレクションに関係なくSRTリンクがあるトークを生成対象にする", () => {
		const result = selectTranscriptSourceTalks([
			{
				id: "TALK-MONTHLY",
				collectionId: "monthly_talk",
				srtLink: "https://example.com/monthly.srt",
			},
			{
				id: "TALK-DHAMMAPADA",
				collectionId: "scripture_commentary",
				srtLink: "https://example.com/dhammapada.srt",
			},
			{
				id: "TALK-NO-SRT",
				collectionId: "scripture_commentary",
				srtLink: null,
			},
		]);

		expect(result.map((talk) => talk.id)).toEqual([
			"TALK-MONTHLY",
			"TALK-DHAMMAPADA",
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

describe("writeGeneratedTranscriptSearchDocuments", () => {
	test("生成済みSRTから検索用JSONを安定した順序で書き出す", async () => {
		const rootDir = await mkdtemp(join(tmpdir(), "gakurin-transcript-index-"));
		const transcriptsDir = join(rootDir, "transcripts");
		const outPath = join(rootDir, "transcript-search-documents.json");

		try {
			await mkdir(transcriptsDir, { recursive: true });
			await writeFile(
				join(transcriptsDir, "TALK-2.srt"),
				`1
00:00:00,000 --> 00:00:02,000
二番目`,
				"utf8",
			);
			await writeFile(
				join(transcriptsDir, "TALK-1.srt"),
				`1
00:00:01,000 --> 00:00:03,000
一番目`,
				"utf8",
			);

			const count = await writeGeneratedTranscriptSearchDocuments(
				outPath,
				transcriptsDir,
			);
			const documents = JSON.parse(await readFile(outPath, "utf8")) as [
				string,
				unknown[],
			][];

			expect(count).toBe(2);
			expect(documents.map(([talkId]) => talkId)).toEqual(["TALK-1", "TALK-2"]);
			expect(documents[0][1][0]).toEqual([
				1,
				1,
				3,
				"00:00:01",
				"00:00:03",
				"一番目",
			]);
		} finally {
			await rm(rootDir, { recursive: true, force: true });
		}
	});
});
