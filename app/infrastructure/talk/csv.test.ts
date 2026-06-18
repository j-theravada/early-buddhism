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
		expect(talk?.kind).toBe("talk");
		expect(talk?.collectionId).toBe("monthly_talk");
		expect(talk?.collectionLabel).toBe("月例講演会");
		expect(talk?.seriesId).toBe("");
		expect(talk?.seriesLabel).toBe("");
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

	test("年月だけの収録日は月初として年代判定に使う", () => {
		const csv = [
			"ID,行事名,タイトル,内容,収録日,収録場所,収録時間,講師,言語,音声フォーマット,非公開",
			"V-001,月例講演会,心と病気の関係,説明文,2004年1月,東京,1:42:14,スマナサーラ,日本語,ISO,TRUE",
		].join("\n");

		const [talk] = parseCSVToTalks(csv);

		expect(talk?.recordedOn).toBe("2004年1月");
		expect(talk?.recordedOnDate?.toISOString()).toBe(
			"2004-01-01T00:00:00.000Z",
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

	test("コレクション列のダンマパダを経典解説シリーズとして取り込む", () => {
		const csv = [
			"ID,コレクション,行事名,タイトル,内容,収録日,収録場所,収録時間,講師,言語,音声フォーマット,非公開",
			"V-001,ダンマパダ,月例講演会,第一章,説明文,1995年9月9日,東京,1:42:14,スマナサーラ,日本語,ISO,TRUE",
		].join("\n");

		const [talk] = parseCSVToTalks(csv);

		expect(talk?.collectionId).toBe("scripture_commentary");
		expect(talk?.collectionLabel).toBe("経典解説");
		expect(talk?.seriesId).toBe("dhammapada");
		expect(talk?.seriesLabel).toBe("ダンマパダ");
	});

	test("シリーズ列をTalkへ取り込む", () => {
		const csv = [
			"ID,コレクション,シリーズ,行事名,タイトル,内容,収録日,収録場所,収録時間,講師,言語,音声フォーマット,非公開",
			"V-001,経典解説,アビダンマ,月例講演会,第一講,説明文,1995年9月9日,東京,1:42:14,スマナサーラ,日本語,ISO,TRUE",
		].join("\n");

		const [talk] = parseCSVToTalks(csv);

		expect(talk?.collectionId).toBe("scripture_commentary");
		expect(talk?.collectionLabel).toBe("経典解説");
		expect(talk?.seriesId).toBe("abhidhamma");
		expect(talk?.seriesLabel).toBe("アビダンマ");
	});

	test("経典列の任意の値をシリーズとして取り込む", () => {
		const csv = [
			"ID,コレクション,経典,行事名,タイトル,内容,収録日,収録場所,収録時間,講師,言語,音声フォーマット,非公開",
			"V-001,経典解説,大念処経,月例講演会,第一講,説明文,1995年9月9日,東京,1:42:14,スマナサーラ,日本語,ISO,TRUE",
		].join("\n");

		const [talk] = parseCSVToTalks(csv);

		expect(talk?.collectionId).toBe("scripture_commentary");
		expect(talk?.collectionLabel).toBe("経典解説");
		expect(talk?.seriesId).toBe("大念処経");
		expect(talk?.seriesLabel).toBe("大念処経");
	});

	test("ダンマパダシートを経典解説シリーズとして取り込む", () => {
		const csv = [
			[
				"ID",
				"ID(章)",
				"行事名",
				"収録場所",
				"収録日",
				"収録時間",
				"タイトル",
				"内容",
				"講師",
				"言語",
				"ファイルのフォーマット",
				"YouTubeリンク",
				"MP3リンク",
				"経典",
				'"公開・\n非公開"',
			].join(","),
			"DD-1,1,ダンマパダ（法句経）講義,ゴータミー精舎,2022年5月11日,2:00:54,人生は心のドラマだ,001偈と002偈,スマナサーラ,日本語,MP3,https://youtu.be/example,https://example.com/audio.mp3,ダンマパダ,公開",
		].join("\n");

		const [talk] = parseCSVToTalks(csv, {
			audioLinkHeaders: ["MP3リンク"],
			collectionSources: ["経典解説"],
			seriesSources: ["ダンマパダ"],
		});

		expect(talk?.id).toMatch(/^TALK-DD-1-/);
		expect(talk?.collectionId).toBe("scripture_commentary");
		expect(talk?.collectionLabel).toBe("経典解説");
		expect(talk?.seriesId).toBe("dhammapada");
		expect(talk?.seriesLabel).toBe("ダンマパダ");
		expect(talk?.audioLink).toBe("https://example.com/audio.mp3");
		expect(talk?.youtubeLink).toBe("https://youtu.be/example");
		expect(talk?.recordedOnDate?.toISOString()).toBe(
			"2022-05-11T00:00:00.000Z",
		);
	});

	test("公開・非公開列の非公開行を除外する", () => {
		const csv = [
			'ID,タイトル,内容,経典,"公開・\n非公開"',
			"DD-1,公開行,説明,ダンマパダ,公開",
			"DD-2,非公開行,説明,ダンマパダ,非公開",
		].join("\n");

		const talks = parseCSVToTalks(csv, {
			collectionSources: ["経典解説"],
			seriesSources: ["ダンマパダ"],
		});

		expect(talks).toHaveLength(1);
		expect(talks[0]?.title).toBe("公開行");
	});

	test("アビダンマシートのYoTubeリンク表記とイベント補完に対応する", () => {
		const csv = [
			"ID,章1,章2,経典,タイトル,内容,収録時間,講師,言語,ファイルのフォーマット,YoTubeリンク,MP3リンク,公開・非公開",
			"(01),,a,アビダンマ,仏教の真理,説明,0:46:41,スマナサーラ,日本語,MP3,https://youtu.be/abhidhamma,https://example.com/abhidhamma.mp3,公開",
		].join("\n");

		const [talk] = parseCSVToTalks(csv, {
			audioLinkHeaders: ["MP3リンク"],
			collectionSources: ["経典解説"],
			eventFallback: "アビダンマ",
			seriesSources: ["アビダンマ"],
		});

		expect(talk?.event).toBe("アビダンマ");
		expect(talk?.collectionId).toBe("scripture_commentary");
		expect(talk?.seriesId).toBe("abhidhamma");
		expect(talk?.youtubeLink).toBe("https://youtu.be/abhidhamma");
		expect(talk?.audioLink).toBe("https://example.com/abhidhamma.mp3");
	});

	test("タイトルだけではシリーズ分類しない", () => {
		const csv = [
			"ID,行事名,タイトル,内容,収録日,収録場所,収録時間,講師,言語,音声フォーマット,非公開",
			"V-001,月例講演会,アビダンマ入門,説明文,1995年9月9日,東京,1:42:14,スマナサーラ,日本語,ISO,TRUE",
		].join("\n");

		const [talk] = parseCSVToTalks(csv);

		expect(talk?.collectionId).toBe("monthly_talk");
		expect(talk?.collectionLabel).toBe("月例講演会");
		expect(talk?.seriesId).toBe("");
		expect(talk?.seriesLabel).toBe("");
	});
});
