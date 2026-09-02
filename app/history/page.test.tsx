import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { historyPageMetadata, HistoryPageView } from "./history-page-view";

test("認証済みユーザーの履歴ページはnoindexでページ枠を描画する", async () => {
	const html = renderToStaticMarkup(<HistoryPageView entries={[]} />);

	expect(historyPageMetadata).toMatchObject({
		title: "視聴履歴",
		robots: { index: false, follow: false },
	});
	expect(html).toContain("視聴履歴");
});
