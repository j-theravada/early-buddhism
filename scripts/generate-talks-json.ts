import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { deriveTalkTagsFromTranscript } from "../app/domain/talk/tags";
import type { Talk } from "../app/domain/talk/types";
import { parseSrt } from "../app/domain/transcript/parser";
import { parseCSVToTalks, SHEET_URL } from "../app/infrastructure/talk/csv";
import { writeGeneratedTranscripts } from "../app/infrastructure/transcript/generation";

type SerializedTalk = Omit<Talk, "recordedOnDate" | "tags"> & {
	recordedOnDate: string | null;
	tags?: undefined;
};

type GeneratedTalkTags = Record<string, string[]>;

function serializeTalk(talk: Talk): SerializedTalk {
	return {
		...talk,
		recordedOnDate: talk.recordedOnDate
			? talk.recordedOnDate.toISOString()
			: null,
		tags: undefined,
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

async function readTranscriptText(filePath: string): Promise<string> {
	try {
		const content = await readFile(filePath, "utf8");
		return parseSrt(content)
			.map((cue) => cue.text)
			.join("\n");
	} catch (error) {
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			(error as { code?: string }).code === "ENOENT"
		) {
			return "";
		}
		throw error;
	}
}

async function buildGeneratedTalkTags(
	transcriptsDir: string,
	talks: Talk[],
): Promise<GeneratedTalkTags> {
	const tagsByTalkId: GeneratedTalkTags = {};

	for (const talk of talks) {
		const transcriptText = await readTranscriptText(
			resolve(transcriptsDir, `${talk.id}.srt`),
		);
		if (!transcriptText) {
			continue;
		}

		const tags = deriveTalkTagsFromTranscript(transcriptText);
		if (tags.length > 0) {
			tagsByTalkId[talk.id] = tags;
		}
	}

	return tagsByTalkId;
}

async function writeGeneratedTalkTags(
	outPath: string,
	tagsByTalkId: GeneratedTalkTags,
) {
	await mkdir(dirname(outPath), { recursive: true });
	await writeFile(outPath, stringifyGeneratedTalkTags(tagsByTalkId), "utf8");

	console.log(
		`Wrote transcript-derived tags for ${Object.keys(tagsByTalkId).length} talks to ${outPath}`,
	);
}

function stringifyGeneratedTalkTags(tagsByTalkId: GeneratedTalkTags): string {
	const entries = Object.entries(tagsByTalkId);
	const lines = ["{"];

	for (let i = 0; i < entries.length; i += 1) {
		const [talkId, tags] = entries[i];
		const entryComma = i === entries.length - 1 ? "" : ",";
		const inlineTags = `[${tags.map((tag) => JSON.stringify(tag)).join(", ")}]`;
		const inlineLine = `\t${JSON.stringify(talkId)}: ${inlineTags}${entryComma}`;

		if (getDisplayWidth(inlineLine) <= 80) {
			lines.push(inlineLine);
			continue;
		}

		lines.push(`\t${JSON.stringify(talkId)}: [`);
		for (let j = 0; j < tags.length; j += 1) {
			const tagComma = j === tags.length - 1 ? "" : ",";
			lines.push(`\t\t${JSON.stringify(tags[j])}${tagComma}`);
		}
		lines.push(`\t]${entryComma}`);
	}

	lines.push("}");
	return `${lines.join("\n")}\n`;
}

function getDisplayWidth(value: string): number {
	return [...value].reduce(
		(width, char) => width + (char.charCodeAt(0) > 127 ? 2 : 1),
		0,
	);
}

async function main() {
	const talksOutPath = resolve(process.cwd(), "app/generated/talks.json");
	const talkTagsOutPath = resolve(
		process.cwd(),
		"app/generated/talk-tags.json",
	);
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
		const tagsByTalkId = await buildGeneratedTalkTags(transcriptsOutDir, talks);
		await writeGeneratedTalkTags(talkTagsOutPath, tagsByTalkId);
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
