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

async function loadTranscriptSearchDocuments(): Promise<
	TranscriptSearchDocument[]
> {
	const content = await readFile(TRANSCRIPT_SEARCH_DOCUMENTS_PATH, "utf8");
	// SAFETY: This generated file is written exclusively as serialized transcript tuples by the repository generator.
	const documents = JSON.parse(content) as SerializedTranscriptSearchDocument[];
	return documents.map(deserializeTranscriptSearchDocument);
}

export function createTranscriptSearchDocumentsLoader(
	load: () => Promise<TranscriptSearchDocument[]>,
) {
	let transcriptSearchDocumentsPromise: Promise<
		TranscriptSearchDocument[]
	> | null = null;
	return function getTranscriptSearchDocuments() {
		transcriptSearchDocumentsPromise ??= load().catch((cause: unknown) => {
			transcriptSearchDocumentsPromise = null;
			throw cause;
		});
		return transcriptSearchDocumentsPromise;
	};
}

export const getTranscriptSearchDocuments =
	createTranscriptSearchDocumentsLoader(loadTranscriptSearchDocuments);
