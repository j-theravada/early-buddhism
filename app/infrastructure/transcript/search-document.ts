import { parseSrt } from "../../domain/transcript/parser";
import type { TranscriptCue } from "../../domain/transcript/types";

export type TranscriptSearchDocument = {
	talkId: string;
	text: string;
	cues: TranscriptCue[];
};

export type SerializedTranscriptSearchCue = [
	index: number,
	start: number,
	end: number,
	startLabel: string,
	endLabel: string,
	text: string,
];

export type SerializedTranscriptSearchDocument = [
	talkId: string,
	cues: SerializedTranscriptSearchCue[],
];

export function buildTranscriptSearchTextFromCues(
	cues: Pick<TranscriptCue, "text">[],
): string {
	return cues.map((cue) => cue.text).join(" ");
}

export function buildTranscriptSearchText(content: string): string {
	return buildTranscriptSearchTextFromCues(parseSrt(content));
}

export function serializeTranscriptSearchDocument(
	talkId: string,
	content: string,
): SerializedTranscriptSearchDocument | null {
	const cues = parseSrt(content);
	if (cues.length === 0) {
		return null;
	}

	return [
		talkId,
		cues.map((cue) => [
			cue.index,
			cue.start,
			cue.end,
			cue.startLabel,
			cue.endLabel,
			cue.text,
		]),
	];
}

export function deserializeTranscriptSearchDocument(
	document: SerializedTranscriptSearchDocument,
): TranscriptSearchDocument {
	const [talkId, serializedCues] = document;
	const cues = serializedCues.map(
		([index, start, end, startLabel, endLabel, text]) => ({
			index,
			start,
			end,
			startLabel,
			endLabel,
			text,
		}),
	);

	return {
		talkId,
		text: buildTranscriptSearchTextFromCues(cues),
		cues,
	};
}
