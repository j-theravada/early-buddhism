import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseSrt } from "../../domain/transcript/parser";
import type { TranscriptCue } from "../../domain/transcript/types";

const TRANSCRIPTS_DIR = resolve(process.cwd(), "app/generated/transcripts");

function isSafeTalkId(talkId: string) {
	return /^[A-Za-z0-9_()-]+$/.test(talkId);
}

function isMissingFileError(cause: unknown): cause is { code: "ENOENT" } {
	return (
		typeof cause === "object" &&
		cause !== null &&
		"code" in cause &&
		cause.code === "ENOENT"
	);
}

export async function getTranscriptByTalkId(
	talkId: string,
): Promise<TranscriptCue[] | null> {
	if (!isSafeTalkId(talkId)) return null;

	const filePath = resolve(TRANSCRIPTS_DIR, `${talkId}.srt`);

	try {
		const content = await readFile(filePath, "utf8");
		const cues = parseSrt(content);
		return cues.length ? cues : null;
	} catch (cause) {
		if (isMissingFileError(cause)) return null;
		throw cause;
	}
}
