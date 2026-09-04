import { expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { clerkNextjsMock } from "../testing/clerk-nextjs-mock";

mock.module("@clerk/nextjs", () => clerkNextjsMock);

const { default: Header } = await import("./header");
const { SignedInUserMenu } = await import("./auth-nav");

test("ヘッダーの認証導線とユーザーメニュー内の視聴履歴を描画する", () => {
	const html = renderToStaticMarkup(<Header />);

	expect(html).toContain('href="/login"');
	expect(html).toContain('href="/sign-up"');
	expect(html).toContain('data-user-button-link="true" href="/history"');
	expect(html.match(/href="\/history"/g)).toHaveLength(2);
	expect(html).not.toContain("x.com/EarlyBuddhism");
});

test("字幕管理者だけユーザーメニューに字幕管理を表示する", () => {
	const adminHtml = renderToStaticMarkup(
		<SignedInUserMenu isSubtitleAdmin={true} />,
	);
	const userHtml = renderToStaticMarkup(
		<SignedInUserMenu isSubtitleAdmin={false} />,
	);

	expect(adminHtml).toContain(
		'data-user-button-link="true" href="/subtitle-admin"',
	);
	expect(adminHtml).toContain("字幕管理");
	expect(adminHtml).toContain('href="/history"');
	expect(userHtml).not.toContain('href="/subtitle-admin"');
	expect(userHtml).toContain('href="/history"');
});
