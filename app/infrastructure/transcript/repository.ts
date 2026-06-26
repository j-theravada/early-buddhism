import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseSrt } from "../../domain/transcript/parser";
import type { TranscriptCue } from "../../domain/transcript/types";

const TRANSCRIPTS_DIR = resolve(process.cwd(), "app/generated/transcripts");

function isSafeTalkId(talkId: string) {
	return /^[A-Za-z0-9_-]+$/.test(talkId);
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
	} catch (error) {
		if (error && typeof error === "object" && "code" in error) {
			if ((error as { code?: string }).code === "ENOENT") {
				return null;
			}
		}
		throw error;
	}
}
