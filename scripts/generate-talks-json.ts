import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Talk } from "../app/domain/talk/types";
import {
	collectTranscriptDownloadTargets,
	normalizeTranscriptContent,
} from "../app/infrastructure/transcript/generation";
import {
	parseCSVToTalks,
	SHEET_URL,
} from "../app/infrastructure/talk/csv";

type SerializedTalk = Omit<Talk, "recordedOnDate"> & {
	recordedOnDate: string | null;
};

const TRANSCRIPT_DOWNLOAD_CONCURRENCY = 8;

function serializeTalk(talk: Talk): SerializedTalk {
	return {
		...talk,
		recordedOnDate: talk.recordedOnDate
			? talk.recordedOnDate.toISOString()
			: null,
	};
}

async function hasUsableGeneratedTalks(outPath: string): Promise<boolean> {
	try {
		const current = await readFile(outPath, "utf8");
		const parsed = JSON.parse(current) as unknown;
		return Array.isArray(parsed);
	} catch {
		return false;
	}
}

async function writeGeneratedTalks(outPath: string, talks: Talk[]) {
	const serialized = talks.map(serializeTalk);
	await mkdir(dirname(outPath), { recursive: true });
	await writeFile(
		outPath,
		`${JSON.stringify(serialized, null, "\t")}\n`,
		"utf8",
	);

	console.log(`Wrote ${serialized.length} talks to ${outPath}`);
}

async function writeGeneratedTranscripts(outDir: string, talks: Talk[]) {
	const downloadTargets = collectTranscriptDownloadTargets(talks);
	let writtenCount = 0;

	await rm(outDir, { recursive: true, force: true });
	await mkdir(outDir, { recursive: true });

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
					const response = await fetch(target.downloadUrl);
					if (!response.ok) {
						throw new Error(
							`${response.status} ${response.statusText}`,
						);
					}

					const content = await response.text();
					const normalized = normalizeTranscriptContent(target.talkId, content);
					await writeFile(
						resolve(outDir, `${target.talkId}.srt`),
						`${normalized}\n`,
						"utf8",
					);
					writtenCount += 1;
				} catch (error) {
					const message =
						error instanceof Error ? error.message : String(error);
					console.warn(
						`Skipped transcript for ${target.talkId}. Reason: ${message}`,
					);
				}
			}),
		);
	}

	if (downloadTargets.length > 0 && writtenCount === 0) {
		throw new Error("Failed to generate any transcripts");
	}

	console.log(`Wrote ${writtenCount} transcripts to ${outDir}`);
}

async function main() {
	const talksOutPath = resolve(process.cwd(), "app/generated/talks.json");
	const transcriptsOutDir = resolve(process.cwd(), "app/generated/transcripts");

	try {
		const response = await fetch(SHEET_URL, {
			headers: { Accept: "text/csv" },
		});
		if (!response.ok) {
			throw new Error(
				`Failed to fetch sheet data: ${response.status} ${response.statusText}`,
			);
		}

		const csv = await response.text();
		const talks = parseCSVToTalks(csv);
		await writeGeneratedTranscripts(transcriptsOutDir, talks);
		await writeGeneratedTalks(talksOutPath, talks);
	} catch (error) {
		const canUseExistingData = await hasUsableGeneratedTalks(talksOutPath);
		if (!canUseExistingData) {
			throw error;
		}

		const message = error instanceof Error ? error.message : String(error);
		console.warn(
			`Falling back to existing generated talks at ${talksOutPath}. Reason: ${message}`,
		);
	}
}

await main();
