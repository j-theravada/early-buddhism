import { describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("next/navigation", () => ({
	notFound: () => {
		throw new Error("not found");
	},
	useRouter: () => ({
		back: () => {},
	}),
}));

describe("TalkDetailPage", () => {
	test("詳細画面の内容幅は表示内容に引っ張られず親幅いっぱいを保つ", async () => {
		const { default: TalkDetailPage } = await import("./page");

		const html = renderToStaticMarkup(
			await TalkDetailPage({
				params: Promise.resolve({ id: "TALK-V-013-1-ADC344BF78FB" }),
			}),
		);

		expect(html).toContain(
			'<main class="w-full mx-auto max-w-4xl px-6 py-12 sm:px-8 flex-1">',
		);
	});

	test("動画はスクロールしても画面上部に残る", async () => {
		const { default: TalkDetailPage } = await import("./page");

		const html = renderToStaticMarkup(
			await TalkDetailPage({
				params: Promise.resolve({ id: "TALK-V-013-1-ADC344BF78FB" }),
			}),
		);

		expect(html).toContain("sticky top-0 z-20");
		expect(html).toContain("aspect-video");
	});
});
