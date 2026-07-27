import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import HistoryPage, { metadata } from "./page";

test("履歴ページはnoindexでページ枠を描画する", () => {
	const html = renderToStaticMarkup(<HistoryPage />);

	expect(metadata).toMatchObject({
		title: "視聴履歴",
		robots: { index: false, follow: false },
	});
	expect(html).toContain("視聴履歴");
});
