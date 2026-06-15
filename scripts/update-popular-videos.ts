import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { normalizeTalkId } from "../app/domain/talk/id";
import {
	getPopularTalkPageViews,
	getPopularVideoLookbackDays,
} from "../app/infrastructure/analytics/google-analytics";

type SerializedTalk = {
	id: string;
};

type GeneratedPopularVideos = {
	generatedAt: string;
	lookbackDays: number;
	entries: {
		pagePath: string;
		talkId: string;
		views: number;
	}[];
};

const DEFAULT_CANDIDATE_LIMIT = 24;

async function readKnownTalkIds(talksPath: string): Promise<Set<string>> {
	const raw = await readFile(talksPath, "utf8");
	const talks = JSON.parse(raw) as SerializedTalk[];
	return new Set(talks.map((talk) => normalizeTalkId(talk.id)));
}

async function writeGeneratedPopularVideos(
	outPath: string,
	popularVideos: GeneratedPopularVideos,
) {
	await mkdir(dirname(outPath), { recursive: true });
	await writeFile(
		outPath,
		`${JSON.stringify(popularVideos, null, "\t")}\n`,
		"utf8",
	);
	console.log(
		`Wrote ${popularVideos.entries.length} popular video candidates to ${outPath}`,
	);
}

function getCandidateLimit(): number {
	const value = Number.parseInt(
		process.env.GA4_POPULAR_VIDEO_CANDIDATE_LIMIT ?? "",
		10,
	);
	return Number.isFinite(value) && value > 0 ? value : DEFAULT_CANDIDATE_LIMIT;
}

async function main() {
	const talksPath = resolve(process.cwd(), "app/generated/talks.json");
	const outPath = resolve(process.cwd(), "app/generated/popular-videos.json");
	const knownTalkIds = await readKnownTalkIds(talksPath);
	const pageViews = await getPopularTalkPageViews({
		limit: getCandidateLimit() * 2,
	});
	const entries = pageViews
		.filter((pageView) => knownTalkIds.has(normalizeTalkId(pageView.talkId)))
		.slice(0, getCandidateLimit());

	await writeGeneratedPopularVideos(outPath, {
		entries,
		generatedAt: new Date().toISOString(),
		lookbackDays: getPopularVideoLookbackDays(),
	});
}

await main();
