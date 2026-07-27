import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import Header from "./header";

test("グローバルナビゲーションから視聴履歴へ移動できる", () => {
	const html = renderToStaticMarkup(<Header />);

	expect(html).toContain('href="/history"');
	expect(html).toContain("視聴履歴");
});
