import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import AboutPage, { metadata } from "./page";

test("Aboutで運営主体と法話アーカイブであることを明示する", () => {
	const html = renderToStaticMarkup(<AboutPage />);

	expect(metadata.description).toContain("日本テーラワーダ仏教協会が運営");
	expect(html).toContain("宗教法人日本テーラワーダ仏教協会が運営する");
	expect(html).toContain("法話デジタルアーカイブ");
});
