import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseSrt } from "../../domain/transcript/parser";
import type { TranscriptCue } from "../../domain/transcript/types";
import {
	buildTranscriptSearchText as buildTranscriptSearchTextFromContent,
	deserializeTranscriptSearchDocument,
	type SerializedTranscriptSearchDocument,
	type TranscriptSearchDocument,
} from "./search-document";

const TRANSCRIPTS_DIR = resolve(process.cwd(), "app/generated/transcripts");
const TRANSCRIPT_SEARCH_DOCUMENTS_PATH = resolve(
	process.cwd(),
	"app/generated/transcript-search-documents.json",
);

let transcriptSearchDocumentsPromise: Promise<
	TranscriptSearchDocument[]
> | null = null;

function isSafeTalkId(talkId: string) {
	return /^[A-Za-z0-9_-]+$/.test(talkId);
}

export function buildTranscriptSearchText(content: string): string {
	return buildTranscriptSearchTextFromContent(content);
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

async function loadTranscriptSearchDocuments(): Promise<
	TranscriptSearchDocument[]
> {
	const content = await readFile(TRANSCRIPT_SEARCH_DOCUMENTS_PATH, "utf8");
	const documents = JSON.parse(content) as SerializedTranscriptSearchDocument[];
	return documents.map(deserializeTranscriptSearchDocument);
}

export function getTranscriptSearchDocuments(): Promise<
	TranscriptSearchDocument[]
> {
	transcriptSearchDocumentsPromise ??= loadTranscriptSearchDocuments();
	return transcriptSearchDocumentsPromise;
}
