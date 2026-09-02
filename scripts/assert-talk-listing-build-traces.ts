import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const transcriptSearchDocuments =
	"app/generated/transcript-search-documents.json";

const talkListingRoutes = [
	"/talks",
	"/talks/page/[page]",
	"/talks/[id]",
	"/talks/archive/[page]",
] as const;

type TalkListingRoute = (typeof talkListingRoutes)[number];

const tracePaths = {
	"/talks": ".next/server/app/talks/page.js.nft.json",
	"/talks/page/[page]": ".next/server/app/talks/page/[page]/page.js.nft.json",
	"/talks/[id]": ".next/server/app/talks/[id]/page.js.nft.json",
	"/talks/archive/[page]":
		".next/server/app/talks/archive/[page]/page.js.nft.json",
} as const satisfies Record<TalkListingRoute, string>;

type TraceContents = {
	version: number;
	files: string[];
};

type TalkListingTraceContents = Record<TalkListingRoute, TraceContents>;

function includesTranscriptSearchDocuments(trace: TraceContents): boolean {
	return trace.files.some((file) => file.endsWith(transcriptSearchDocuments));
}

export function assertTalkListingTraceContents(
	traces: TalkListingTraceContents,
): void {
	const expectations = {
		"/talks": true,
		"/talks/page/[page]": true,
		"/talks/[id]": false,
		"/talks/archive/[page]": false,
	} as const satisfies Record<TalkListingRoute, boolean>;

	for (const route of talkListingRoutes) {
		const expected = expectations[route];
		const actual = includesTranscriptSearchDocuments(traces[route]);
		if (actual !== expected) {
			throw new Error(
				`${route} must ${expected ? "include" : "exclude"} transcript-search-documents.json`,
			);
		}
	}
}

async function readTrace(path: string): Promise<TraceContents> {
	return JSON.parse(await readFile(resolve(process.cwd(), path), "utf8"));
}

export async function assertTalkListingBuildTraces(): Promise<void> {
	const entries = await Promise.all(
		talkListingRoutes.map(
			async (route) => [route, await readTrace(tracePaths[route])] as const,
		),
	);
	// SAFETY: Every TalkListingRoute is present exactly once because entries is mapped from talkListingRoutes.
	assertTalkListingTraceContents(
		Object.fromEntries(entries) as TalkListingTraceContents,
	);
}

if (import.meta.main) {
	await assertTalkListingBuildTraces();
	console.log(
		"Talk listing build traces contain search data only for listings.",
	);
}
