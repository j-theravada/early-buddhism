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

		expect(html).toContain("文字起こし");
		expect(html).toContain("00:00:01");
		expect(html).toContain("00:00:03");
		expect(html).toContain("00:00:01 - 00:00:03");
		expect(html).not.toContain("Transcript");
		expect(html).not.toContain("区間");
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
});
