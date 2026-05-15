import { parseSrt } from "../../domain/transcript/parser";
import { buildTranscriptDownloadUrl } from "./download";

type TranscriptSource = {
	id: string;
	srtLink: string | null;
};

export type TranscriptDownloadTarget = {
	talkId: string;
	sourceUrl: string;
	downloadUrl: string;
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
