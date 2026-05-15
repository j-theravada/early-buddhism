import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getTranscriptByTalkId } from "./repository";

const GENERATED_TRANSCRIPTS_DIR = resolve(
	process.cwd(),
	"app/generated/transcripts",
);
const TEST_FILE_PATH = resolve(GENERATED_TRANSCRIPTS_DIR, "TALK-TEST.srt");

afterEach(async () => {
	await rm(TEST_FILE_PATH, { force: true });
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
});
