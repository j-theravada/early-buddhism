import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
	deserializeTranscriptSearchDocument,
	type SerializedTranscriptSearchDocument,
	type TranscriptSearchDocument,
} from "./search-document";

const TRANSCRIPT_SEARCH_DOCUMENTS_PATH = resolve(
	process.cwd(),
	"app/generated/transcript-search-documents.json",
);

let transcriptSearchDocumentsPromise: Promise<
	TranscriptSearchDocument[]
> | null = null;

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
