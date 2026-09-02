import { expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { clerkNextjsMock } from "../testing/clerk-nextjs-mock";

mock.module("@clerk/nextjs", () => clerkNextjsMock);

const { default: Header } = await import("./header");

test("ヘッダーの認証導線とユーザーメニュー内の視聴履歴を描画する", () => {
	const html = renderToStaticMarkup(<Header />);

	expect(html).toContain('href="/login"');
	expect(html).toContain('href="/sign-up"');
	expect(html).toContain('data-user-button-link="true" href="/history"');
	expect(html.match(/href="\/history"/g)).toHaveLength(2);
	expect(html).not.toContain("x.com/EarlyBuddhism");
});
