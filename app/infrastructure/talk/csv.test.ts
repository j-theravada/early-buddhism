import { describe, expect, test } from "bun:test";
import { parseCSVToTalks } from "./csv";

describe("parseCSVToTalks", () => {
	test("Talkにsummaryプロパティを含めない", () => {
		const csv = [
			"ID,行事名,タイトル,内容,収録日,収録場所,収録時間,講師,言語,音声フォーマット,リンク,添付データ,YouTube,非公開",
			"V-001,月例講演会,心と病気の関係,説明文,1995年9月9日,東京,1:42:14,スマナサーラ,日本語,ISO,,,,TRUE",
		].join("\n");

		const [talk] = parseCSVToTalks(csv);

		expect(talk).toBeDefined();
		expect("summary" in (talk ?? {})).toBe(false);
	});

	test("SRTリンク列をTalkへ取り込む", () => {
		const csv = [
			"ID,行事名,タイトル,内容,収録日,収録場所,収録時間,講師,言語,音声フォーマット,SRTリンク,非公開",
			"V-001,月例講演会,心と病気の関係,説明文,1995年9月9日,東京,1:42:14,スマナサーラ,日本語,ISO,https://drive.google.com/file/d/test-id/view?usp=sharing,TRUE",
		].join("\n");

		const [talk] = parseCSVToTalks(csv);

		expect(talk).toBeDefined();
		expect(talk?.srtLink).toBe(
			"https://drive.google.com/file/d/test-id/view?usp=sharing",
		);
	});
});
