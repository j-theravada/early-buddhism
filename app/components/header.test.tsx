import { expect, mock, test } from "bun:test";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("@clerk/nextjs", () => ({
	Show: ({ children, when }: { children: ReactNode; when: string }) =>
		when === "signed-out" ? children : null,
	UserButton: () => null,
	useUser: () => ({ user: null }),
}));

const { default: Header } = await import("./header");

test("グローバルナビゲーションから視聴履歴へ移動できる", () => {
	const html = renderToStaticMarkup(<Header />);

	expect(html).toContain('href="/history"');
	expect(html).toContain("視聴履歴");
	expect(html).not.toContain('href="/login"');
	expect(html).not.toContain('href="/sign-up"');
});
