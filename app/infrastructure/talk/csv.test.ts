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

	test("収録日は実行環境のタイムゾーンに左右されないUTC日付で持つ", () => {
		const csv = [
			"ID,行事名,タイトル,内容,収録日,収録場所,収録時間,講師,言語,音声フォーマット,非公開",
			"V-001,月例講演会,心と病気の関係,説明文,1995年9月9日,東京,1:42:14,スマナサーラ,日本語,ISO,TRUE",
		].join("\n");

		const [talk] = parseCSVToTalks(csv);

		expect(talk?.recordedOnDate?.toISOString()).toBe(
			"1995-09-09T00:00:00.000Z",
		);
	});

	test("PPTリンク列をスライドリンクとして取り込む", () => {
		const csv = [
			"ID,行事名,タイトル,内容,収録日,収録場所,収録時間,講師,言語,音声フォーマット,PPTリンク1,PPTリンク2,非公開",
			"V-001,月例講演会,心と病気の関係,説明文,1995年9月9日,東京,1:42:14,スマナサーラ,日本語,ISO,https://docs.google.com/presentation/d/slide-1/edit,https://docs.google.com/presentation/d/slide-2/edit,TRUE",
		].join("\n");

		const [talk] = parseCSVToTalks(csv);

		expect(talk?.slideLinks).toEqual([
			"https://docs.google.com/presentation/d/slide-1/edit",
			"https://docs.google.com/presentation/d/slide-2/edit",
		]);
	});
});
