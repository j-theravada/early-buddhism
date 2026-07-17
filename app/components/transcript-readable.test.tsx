import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import TranscriptReadable from "./transcript-readable";

test("全文を簡潔な段落HTMLとして出す", () => {
	const html = renderToStaticMarkup(
		<TranscriptReadable paragraphs={["第一段落です。", "第二段落です。"]} />,
	);

	expect(html).toContain("第一段落です。");
	expect(html).toContain("第二段落です。");
	expect((html.match(/<p/g) ?? []).length).toBe(2);
	expect(html).not.toContain("00:00:");
	expect(html).not.toContain("文字起こしを読み込み中です");
});
