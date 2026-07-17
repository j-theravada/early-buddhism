import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import TranscriptSection from "./transcript-section";

describe("TranscriptSection", () => {
	test("タイムスタンプ付き文字起こしと再生リンクを出す", () => {
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
		expect(html).toContain(
			'href="https://example.com/embed?start=1&amp;autoplay=1"',
		);
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
