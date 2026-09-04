import { describe, expect, test } from "bun:test";
import {
	parseCreateTranscriptChangeRequestInput,
	parseTranscriptChangeRequestReviewInput,
} from "./change-request";

describe("transcript change request input", () => {
	test("修正文と任意の補足を正規化する", () => {
		expect(
			parseCreateTranscriptChangeRequestInput({
				talkId: " TALK-1 ",
				cueIndex: 7,
				proposedText: "  修正後  \r\n  二行目  ",
				reason: "  固有名詞です  ",
			}),
		).toEqual({
			talkId: "TALK-1",
			cueIndex: 7,
			proposedText: "修正後\n二行目",
			reason: "固有名詞です",
		});
	});

	test("空本文、空行、範囲外cueを拒否する", () => {
		for (const input of [
			{ talkId: "TALK-1", cueIndex: 1, proposedText: " " },
			{ talkId: "TALK-1", cueIndex: 1, proposedText: "一行\n\n二行" },
			{ talkId: "TALK-1", cueIndex: -1, proposedText: "修正" },
		]) {
			expect(parseCreateTranscriptChangeRequestInput(input)).toBeNull();
		}
	});
});

describe("transcript change request review input", () => {
	test("承認と却下だけを受理する", () => {
		expect(
			parseTranscriptChangeRequestReviewInput({ decision: "approve" }),
		).toEqual({ decision: "approve", reviewNote: null });
		expect(
			parseTranscriptChangeRequestReviewInput({
				decision: "reject",
				reviewNote: " 別の表記を採用 ",
			}),
		).toEqual({ decision: "reject", reviewNote: "別の表記を採用" });
		expect(
			parseTranscriptChangeRequestReviewInput({ decision: "later" }),
		).toBeNull();
	});
});
