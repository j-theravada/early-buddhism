import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import Footer from "./footer";

test("運営組織を可視テキストで示す", () => {
	const html = renderToStaticMarkup(<Footer />);

	expect(html).toContain("運営：日本テーラワーダ仏教協会");
	expect(html).toContain('href="https://j-theravada.com/"');
	expect(html).toContain('href="https://x.com/EarlyBuddhism"');
	expect(html).toContain('aria-label="Xで初期仏教塾を見る"');
});
