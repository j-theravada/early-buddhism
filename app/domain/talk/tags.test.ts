import { describe, expect, test } from "bun:test";
import {
	deriveTalkTags,
	deriveTalkTagsFromTranscript,
	getTalkTags,
} from "./tags";

describe("talk tag helpers", () => {
	test("タイトルと説明文からタグを推定する", () => {
		const result = deriveTalkTags({
			title: "無常観 悦びの心、安らぎの心を得る",
			description: "慈悲の瞑想実践法付。",
			event: "月例講演会",
		});

		expect(result).toEqual([
			"瞑想",
			"慈悲",
			"無常",
			"幸福",
			"心",
			"月例講演会",
		]);
	});

	test("手動タグを推定タグより前に重複なしで追加する", () => {
		const result = getTalkTags(
			{
				id: "TALK-V-007-1-TEST",
				dvdId: "V-007",
				title: "無常観",
				description: "慈悲の瞑想実践法付。",
				event: "月例講演会",
				tags: ["瞑想"],
			},
			{
				byId: {
					"TALK-V-007-1-TEST": ["おすすめ"],
				},
				byDvdId: {
					"V-007": ["入門", "慈悲"],
				},
			},
		);

		expect(result).toEqual([
			"おすすめ",
			"入門",
			"慈悲",
			"瞑想",
			"無常",
			"月例講演会",
		]);
	});

	test("SRT本文は出現回数のしきい値でタグを推定する", () => {
		const result = deriveTalkTagsFromTranscript(
			[
				"慈悲の瞑想を実践します。",
				"慈悲によって怒りを観察します。",
				"慈悲は心を育てます。",
				"瞑想を続けます。",
				"瞑想で落ち着きます。",
				"慈悲の瞑想を続けます。",
				"慈悲の瞑想を続けます。",
				"瞑想を続けます。",
				"怒りは一度だけ出ます。",
			].join("\n"),
		);

		expect(result).toEqual(["瞑想", "慈悲"]);
	});
});
