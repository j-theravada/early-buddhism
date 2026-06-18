import { describe, expect, test } from "bun:test";
import {
	parseContentCollectionId,
	parseContentSeriesId,
	resolveContentClassification,
	resolveContentCollection,
} from "./collection";

describe("resolveContentCollection", () => {
	test("ダンマパダを経典解説のシリーズとして扱う", () => {
		expect(
			resolveContentClassification({
				collectionSources: ["ダンマパダ"],
			}),
		).toEqual({
			collectionId: "scripture_commentary",
			collectionLabel: "経典解説",
			seriesId: "dhammapada",
			seriesLabel: "ダンマパダ",
		});
	});

	test("アビダンマを経典解説のシリーズとして扱う", () => {
		expect(
			resolveContentClassification({
				collectionSources: ["経典解説"],
				seriesSources: ["アビダンマ"],
			}),
		).toEqual({
			collectionId: "scripture_commentary",
			collectionLabel: "経典解説",
			seriesId: "abhidhamma",
			seriesLabel: "アビダンマ",
		});
	});

	test("経典列の任意の値を経典解説のシリーズとして扱う", () => {
		expect(
			resolveContentClassification({
				collectionSources: ["経典解説"],
				seriesSources: ["大念処経"],
			}),
		).toEqual({
			collectionId: "scripture_commentary",
			collectionLabel: "経典解説",
			seriesId: "大念処経",
			seriesLabel: "大念処経",
		});
	});

	test("任意シリーズのIDは正規化しつつ表示ラベルは元表記を残す", () => {
		expect(
			resolveContentClassification({
				collectionSources: ["経典解説"],
				seriesSources: ["中部22「蛇喩経（Alagaddūpamasuttaṃ）」"],
			}),
		).toEqual({
			collectionId: "scripture_commentary",
			collectionLabel: "経典解説",
			seriesId: "中部22「蛇喩経(Alagaddūpamasuttaṃ)」",
			seriesLabel: "中部22「蛇喩経（Alagaddūpamasuttaṃ）」",
		});
	});

	test("経典列のプレースホルダはシリーズにしない", () => {
		expect(
			resolveContentClassification({
				collectionSources: ["経典解説"],
				seriesSources: ["ー"],
			}),
		).toEqual({
			collectionId: "scripture_commentary",
			collectionLabel: "経典解説",
			seriesId: "",
			seriesLabel: "",
		});
	});

	test("月例講演会を専用コレクションとして扱う", () => {
		expect(resolveContentCollection(["", "月例講演会"])).toEqual({
			collectionId: "monthly_talk",
			collectionLabel: "月例講演会",
		});
	});

	test("既知コレクションでない場合は入力ラベルを残す", () => {
		expect(resolveContentCollection(["瞑想会"])).toEqual({
			collectionId: "other",
			collectionLabel: "瞑想会",
		});
	});

	test("URL向けのコレクションIDだけを受け取る", () => {
		expect(parseContentCollectionId("monthly_talk")).toBe("monthly_talk");
		expect(parseContentCollectionId("scripture_commentary")).toBe(
			"scripture_commentary",
		);
		expect(parseContentCollectionId("ダンマパダ")).toBe("");
	});

	test("URL向けのシリーズIDを受け取る", () => {
		expect(parseContentSeriesId("dhammapada")).toBe("dhammapada");
		expect(parseContentSeriesId("abhidhamma")).toBe("abhidhamma");
		expect(parseContentSeriesId("アビダンマ")).toBe("abhidhamma");
		expect(parseContentSeriesId("大念処経")).toBe("大念処経");
		expect(parseContentSeriesId("ー")).toBe("");
		expect(parseContentSeriesId("経典解説")).toBe("");
	});
});
