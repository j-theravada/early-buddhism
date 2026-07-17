import { expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("next/navigation", () => ({
	usePathname: () => "/talks",
	useRouter: () => ({ back: () => {} }),
}));

test("6件プレビューを保ったまま全法話アーカイブへリンクする", async () => {
	const { default: TalksPage } = await import("./page");
	const html = renderToStaticMarkup(await TalksPage());

	expect((html.match(/href="\/talks\/TALK-/g) ?? []).length).toBe(6);
	expect(html).toContain('href="/talks/archive/1"');
	expect(html).toContain("全法話をページ一覧で見る");
});
