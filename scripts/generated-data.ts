import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const GENERATED_DATA_HASH_META_KEY = "generatedDataHash";
export const SEARCH_DATABASE_SCHEMA_VERSION = "7";
export const SEARCH_DATABASE_SCHEMA_VERSION_META_KEY =
	"searchDatabaseSchemaVersion";

type GeneratedDataPaths = {
	talksPath: string;
	transcriptSearchPath: string;
	transcriptsDir: string;
};

type TranscriptSearchDocumentSummary = {
	talkId?: unknown;
};

export type GeneratedDataSummary = {
	talkCount: number;
	transcriptDocumentCount: number;
	transcriptFileCount: number;
};

function getGeneratedDataPaths(): GeneratedDataPaths {
	const generatedDir = resolve(process.cwd(), "app/generated");
	return {
		talksPath: resolve(generatedDir, "talks.json"),
		transcriptSearchPath: resolve(
			generatedDir,
			"transcript-search-documents.json",
		),
		transcriptsDir: resolve(generatedDir, "transcripts"),
	};
}

async function readJsonArray(path: string, label: string): Promise<unknown[]> {
	const raw = await readFile(path, "utf8");
	const parsed = JSON.parse(raw) as unknown;
	if (!Array.isArray(parsed) || parsed.length === 0) {
		throw new Error(`${label} must be a non-empty JSON array`);
	}
	return parsed;
}

export async function validateGeneratedData(): Promise<GeneratedDataSummary> {
	const { talksPath, transcriptSearchPath, transcriptsDir } =
		getGeneratedDataPaths();
	const [talks, transcriptDocuments, transcriptFileNames] = await Promise.all([
		readJsonArray(talksPath, "generated talks"),
		readJsonArray(transcriptSearchPath, "transcript search documents"),
		readdir(transcriptsDir),
	]);
	const transcriptFiles = new Set(
		transcriptFileNames.filter((fileName) => fileName.endsWith(".srt")),
	);
	const missingTranscriptIds = transcriptDocuments
		.map((document) =>
			typeof (document as TranscriptSearchDocumentSummary).talkId === "string"
				? (document as { talkId: string }).talkId
				: "",
		)
		.filter((talkId) => talkId && !transcriptFiles.has(`${talkId}.srt`));

	if (missingTranscriptIds.length > 0) {
		throw new Error(
			`generated transcripts are missing ${missingTranscriptIds.length} files`,
		);
	}

	return {
		talkCount: talks.length,
		transcriptDocumentCount: transcriptDocuments.length,
		transcriptFileCount: transcriptFiles.size,
	};
}

export async function getGeneratedSearchDataFingerprint(): Promise<string> {
	const { talksPath, transcriptSearchPath } = getGeneratedDataPaths();
	const hash = createHash("sha256");
	for (const path of [talksPath, transcriptSearchPath]) {
		hash.update(await readFile(path));
	}
	return hash.digest("hex");
}
