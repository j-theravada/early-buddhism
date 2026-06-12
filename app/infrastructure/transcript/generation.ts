import {
	mkdir,
	mkdtemp,
	readFile,
	rename,
	rm,
	writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseSrt } from "../../domain/transcript/parser";
import { buildTranscriptDownloadUrl } from "./download";

const TRANSCRIPT_DOWNLOAD_CONCURRENCY = 8;

type TranscriptSource = {
	id: string;
	srtLink: string | null;
};

export type TranscriptDownloadTarget = {
	talkId: string;
	sourceUrl: string;
	downloadUrl: string;
};

type TranscriptFetcher = (target: TranscriptDownloadTarget) => Promise<string>;

type WriteGeneratedTranscriptsOptions = {
	fetchTranscript?: TranscriptFetcher;
	warn?: (message: string) => void;
};

export type WriteGeneratedTranscriptsResult = {
	writtenCount: number;
	retainedCount: number;
};

export function collectTranscriptDownloadTargets(
	talks: TranscriptSource[],
): TranscriptDownloadTarget[] {
	return talks.flatMap((talk) => {
		if (!talk.srtLink) {
			return [];
		}

		return [
			{
				talkId: talk.id,
				sourceUrl: talk.srtLink,
				downloadUrl: buildTranscriptDownloadUrl(talk.srtLink),
			},
		];
	});
}

export function normalizeTranscriptContent(
	talkId: string,
	content: string,
): string {
	const normalized = content.replace(/\r/g, "").trim();
	if (parseSrt(normalized).length === 0) {
		throw new Error(`Invalid transcript content for ${talkId}`);
	}
	return normalized;
}

async function fetchTranscript(
	target: TranscriptDownloadTarget,
): Promise<string> {
	const response = await fetch(target.downloadUrl);
	if (!response.ok) {
		throw new Error(`${response.status} ${response.statusText}`);
	}

	return response.text();
}

async function retainExistingTranscript(
	outDir: string,
	tempDir: string,
	talkId: string,
): Promise<boolean> {
	try {
		const current = await readFile(resolve(outDir, `${talkId}.srt`), "utf8");
		const normalized = normalizeTranscriptContent(talkId, current);
		await writeFile(
			resolve(tempDir, `${talkId}.srt`),
			`${normalized}\n`,
			"utf8",
		);
		return true;
	} catch (error) {
		if (error && typeof error === "object" && "code" in error) {
			if ((error as { code?: string }).code === "ENOENT") {
				return false;
			}
		}
		return false;
	}
}

export async function writeGeneratedTranscripts(
	outDir: string,
	talks: TranscriptSource[],
	options: WriteGeneratedTranscriptsOptions = {},
): Promise<WriteGeneratedTranscriptsResult> {
	const downloadTargets = collectTranscriptDownloadTargets(talks);
	const fetcher = options.fetchTranscript ?? fetchTranscript;
	const warn = options.warn ?? console.warn;
	let writtenCount = 0;
	let retainedCount = 0;

	await mkdir(dirname(outDir), { recursive: true });
	const tempDir = await mkdtemp(resolve(dirname(outDir), ".transcripts-"));
	let promoted = false;

	try {
		for (
			let startIndex = 0;
			startIndex < downloadTargets.length;
			startIndex += TRANSCRIPT_DOWNLOAD_CONCURRENCY
		) {
			const chunk = downloadTargets.slice(
				startIndex,
				startIndex + TRANSCRIPT_DOWNLOAD_CONCURRENCY,
			);

			await Promise.all(
				chunk.map(async (target) => {
					try {
						const content = await fetcher(target);
						const normalized = normalizeTranscriptContent(
							target.talkId,
							content,
						);
						await writeFile(
							resolve(tempDir, `${target.talkId}.srt`),
							`${normalized}\n`,
							"utf8",
						);
						writtenCount += 1;
					} catch (error) {
						const message =
							error instanceof Error ? error.message : String(error);
						const retained = await retainExistingTranscript(
							outDir,
							tempDir,
							target.talkId,
						);

						if (retained) {
							retainedCount += 1;
							warn(
								`Retained existing transcript for ${target.talkId}. Reason: ${message}`,
							);
							return;
						}

						warn(`Skipped transcript for ${target.talkId}. Reason: ${message}`);
					}
				}),
			);
		}

		if (downloadTargets.length > 0 && writtenCount + retainedCount === 0) {
			throw new Error("Failed to generate any transcripts");
		}

		await rm(outDir, { recursive: true, force: true });
		await rename(tempDir, outDir);
		promoted = true;
	} finally {
		if (!promoted) {
			await rm(tempDir, { recursive: true, force: true });
		}
	}

	return {
		writtenCount,
		retainedCount,
	};
}
