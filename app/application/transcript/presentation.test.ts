import { describe, expect, test } from "bun:test";
import { buildCueTimeHref, buildTranscriptParagraphs } from "./presentation";
import type { TranscriptCue } from "../../domain/transcript/types";

const cues: TranscriptCue[] = [
	{
		index: 1,
		start: 0,
		end: 2,
		startLabel: "00:00:00",
		endLabel: "00:00:02",
		text: "最初の文です。",
	},
	{
		index: 2,
		start: 2.1,
		end: 4,
		startLabel: "00:00:02",
		endLabel: "00:00:04",
		text: "続きの文です。",
	},
	{
		index: 3,
		start: 8,
		end: 10,
		startLabel: "00:00:08",
		endLabel: "00:00:10",
		text: "ここで段落が分かれます。",
	},
];

describe("transcript presentation helpers", () => {
	test("キュー列から読みやすい段落を組み立てる", () => {
		const result = buildTranscriptParagraphs(cues);

		expect(result).toEqual([
			"最初の文です。 続きの文です。",
			"ここで段落が分かれます。",
		]);
	});

	test("埋め込みURLがあるときだけ再生リンクを返す", () => {
		expect(buildCueTimeHref("https://example.com/embed?", 12)).toBe(
			"https://example.com/embed?start=12&autoplay=1",
		);
		expect(buildCueTimeHref(null, 12)).toBeNull();
	});
});
