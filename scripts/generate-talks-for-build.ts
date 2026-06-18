import { validateGeneratedData } from "./generated-data";

function shouldRefreshGeneratedData(): boolean {
	const value =
		process.env.GAKURIN_REFRESH_GENERATED_DATA ??
		process.env.GAKURIN_GENERATE_TALKS_DURING_BUILD;
	return value === "1" || value === "true";
}

if (shouldRefreshGeneratedData()) {
	await import("./generate-talks-json");
} else {
	try {
		const summary = await validateGeneratedData();
		console.log(
			`Using existing generated talk data for build (${summary.talkCount} talks, ${summary.transcriptDocumentCount} transcript documents, ${summary.transcriptFileCount} transcript files). Run \`bun run generate-talks\` to refresh.`,
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(
			`Generated talk data is not usable for build. Refreshing it now. Reason: ${message}`,
		);
		await import("./generate-talks-json");
	}
}

export {};
