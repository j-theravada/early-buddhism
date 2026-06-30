import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getTranscriptByTalkId } from "./repository";
import { buildTranscriptSearchText } from "./search-document";

const GENERATED_TRANSCRIPTS_DIR = resolve(
	process.cwd(),
	"app/generated/transcripts",
);
const TEST_FILE_PATH = resolve(GENERATED_TRANSCRIPTS_DIR, "TALK-TEST.srt");
const TEST_PARENTHESES_FILE_PATH = resolve(
	GENERATED_TRANSCRIPTS_DIR,
	"TALK-(01)-TEST.srt",
);

afterEach(async () => {
	await rm(TEST_FILE_PATH, { force: true });
	await rm(TEST_PARENTHESES_FILE_PATH, { force: true });
});

describe("getTranscriptByTalkId", () => {
	test("generated/transcripts配下のSRTを読む", async () => {
		await mkdir(GENERATED_TRANSCRIPTS_DIR, { recursive: true });
		await writeFile(
			TEST_FILE_PATH,
			`1
00:00:00,000 --> 00:00:02,000
最初の行`,
			"utf8",
		);

		const result = await getTranscriptByTalkId("TALK-TEST");

		expect(result).toHaveLength(1);
		expect(result?.[0]?.text).toBe("最初の行");
	});

	test("生成済みIDに含まれる括弧つきのSRTも読む", async () => {
		await mkdir(GENERATED_TRANSCRIPTS_DIR, { recursive: true });
		await writeFile(
			TEST_PARENTHESES_FILE_PATH,
			`1
00:00:00,000 --> 00:00:02,000
括弧つきID`,
			"utf8",
		);

		const result = await getTranscriptByTalkId("TALK-(01)-TEST");

		expect(result).toHaveLength(1);
		expect(result?.[0]?.text).toBe("括弧つきID");
	});

	test("パス区切りを含むIDは読まない", async () => {
		const result = await getTranscriptByTalkId("../TALK-TEST");

		expect(result).toBeNull();
	});

	test("SRTから検索用の本文テキストを取り出す", () => {
		const result = buildTranscriptSearchText(`1
00:00:00,000 --> 00:00:02,000
最初の行

2
00:00:02,000 --> 00:00:04,000
次の行`);

		expect(result).toBe("最初の行 次の行");
		expect(result).not.toContain("00:00");
	});
});
