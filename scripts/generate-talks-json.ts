import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Talk } from "../app/domain/talk/types";
import {
	parseCSVToTalks,
	SHEET_URL,
} from "../app/infrastructure/talk/csv";
import { writeGeneratedTranscripts } from "../app/infrastructure/transcript/generation";

type SerializedTalk = Omit<Talk, "recordedOnDate"> & {
	recordedOnDate: string | null;
};

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
		const transcriptResult = await writeGeneratedTranscripts(
			transcriptsOutDir,
			talks,
		);
		const retainedMessage =
			transcriptResult.retainedCount > 0
				? ` (retained ${transcriptResult.retainedCount} existing transcripts)`
				: "";
		console.log(
			`Wrote ${transcriptResult.writtenCount} transcripts to ${transcriptsOutDir}${retainedMessage}`,
		);
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
