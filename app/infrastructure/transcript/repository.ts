import { readdir, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { parseSrt } from "../../domain/transcript/parser";
import type { TranscriptCue } from "../../domain/transcript/types";

const TRANSCRIPTS_DIR = resolve(process.cwd(), "app/generated/transcripts");

export type TranscriptSearchDocument = {
	talkId: string;
	text: string;
	cues: TranscriptCue[];
};

let transcriptSearchDocumentsPromise: Promise<
	TranscriptSearchDocument[]
> | null = null;

function isSafeTalkId(talkId: string) {
	return /^[A-Za-z0-9_-]+$/.test(talkId);
}

export function buildTranscriptSearchText(content: string): string {
	return buildTranscriptSearchTextFromCues(parseSrt(content));
}

function buildTranscriptSearchTextFromCues(cues: TranscriptCue[]): string {
	return cues.map((cue) => cue.text).join(" ");
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
	let fileNames: string[];

	try {
		fileNames = await readdir(TRANSCRIPTS_DIR);
	} catch (error) {
		if (error && typeof error === "object" && "code" in error) {
			if ((error as { code?: string }).code === "ENOENT") {
				return [];
			}
		}
		throw error;
	}

	const documents = await Promise.all(
		fileNames
			.filter((fileName) => fileName.endsWith(".srt"))
			.map(async (fileName) => {
				const content = await readFile(
					resolve(TRANSCRIPTS_DIR, fileName),
					"utf8",
				);
				const cues = parseSrt(content);
				const text = buildTranscriptSearchTextFromCues(cues);
				if (!text) {
					return null;
				}

				return {
					talkId: basename(fileName, ".srt"),
					text,
					cues,
				};
			}),
	);

	return documents.filter(
		(document): document is TranscriptSearchDocument => document !== null,
	);
}

export function getTranscriptSearchDocuments(): Promise<
	TranscriptSearchDocument[]
> {
	transcriptSearchDocumentsPromise ??= loadTranscriptSearchDocuments();
	return transcriptSearchDocumentsPromise;
}
