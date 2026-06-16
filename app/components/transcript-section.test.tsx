import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import TranscriptSection from "./transcript-section";

describe("TranscriptSection", () => {
	test("初期表示で余計な装飾なしにタイムスタンプ付き文字起こしを出す", () => {
		const html = renderToStaticMarkup(
			<TranscriptSection
				embedUrlPrefix="https://example.com/embed?"
				transcript={[
					{
						index: 1,
						start: 1,
						end: 3.5,
						startLabel: "00:00:01",
						endLabel: "00:00:03",
						text: "最初の行です。",
					},
				]}
			/>,
		);

		expect(html).toContain("00:00:01");
		expect(html).toContain("00:00:03");
		expect(html).toContain("00:00:01 - 00:00:03");
		expect(html).toContain("AI文字起こしです。誤りは");
		expect(html).toContain("へ。");
		expect(html).not.toContain("<h3");
		expect(html).not.toContain("Transcript");
		expect(html).not.toContain("区間");
		expect(html).not.toContain("これはAIの文字起こしを元にしたものです");
	});

	test("表示切り替えは選択中のラベル長で横幅が変わらない", () => {
		const html = renderToStaticMarkup(
			<TranscriptSection
				transcript={[
					{
						index: 1,
						start: 1,
						end: 3.5,
						startLabel: "00:00:01",
						endLabel: "00:00:03",
						text: "最初の行です。",
					},
				]}
			/>,
		);

		expect(html).toContain("grid w-full grid-cols-2");
		expect(html).toContain("w-full min-w-0 whitespace-nowrap text-center");
		expect(html).toContain("sm:min-w-[8.5rem]");
	});

	test("動画あり詳細では文字起こしヘッダーを動画下に固定する", () => {
		const html = renderToStaticMarkup(
			<TranscriptSection
				hasStickyPlayer
				transcript={[
					{
						index: 1,
						start: 1,
						end: 3.5,
						startLabel: "00:00:01",
						endLabel: "00:00:03",
						text: "最初の行です。",
					},
				]}
			/>,
		);

		expect(html).toContain("sticky transcript-toolbar-sticky");
		expect(html).toContain("lg:flex-nowrap");
	});

	test("指定されたcueへ飛べるidと検索語ハイライトを出す", () => {
		const html = renderToStaticMarkup(
			<TranscriptSection
				targetCueIndex={7}
				transcript={[
					{
						index: 7,
						start: 10,
						end: 13,
						startLabel: "00:00:10",
						endLabel: "00:00:13",
						text: "ここで預流果について説明します。",
					},
				]}
				transcriptHighlightQuery="預流果"
			/>,
		);

		expect(html).toContain('id="transcript-cue-7"');
		expect(html).toContain("bg-yellow-50");
		expect(html).toContain("<mark");
		expect(html).toContain("預流果");
	});
});
