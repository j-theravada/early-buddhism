import { describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("next/navigation", () => ({
	notFound: () => {
		throw new Error("not found");
	},
}));

describe("TalkArchivePage", () => {
	test("100件の通常リンクと全ページナビゲーションを出す", async () => {
		const { default: TalkArchivePage, generateStaticParams } =
			await import("./page");
		const html = renderToStaticMarkup(
			await TalkArchivePage({ params: Promise.resolve({ page: "1" }) }),
		);
		const params = await generateStaticParams();

		expect((html.match(/data-talk-archive-item=/g) ?? []).length).toBe(100);
		expect(html).toContain('href="/talks/');
		expect(html).toContain('href="/talks/archive/10"');
		expect(params).toHaveLength(10);
	});

	test("中間ページに前後リンクを出す", async () => {
		const { default: TalkArchivePage } = await import("./page");
		const html = renderToStaticMarkup(
			await TalkArchivePage({ params: Promise.resolve({ page: "2" }) }),
		);

		expect(html).toContain('href="/talks/archive/1"');
		expect(html).toContain("← 前へ");
		expect(html).toContain('href="/talks/archive/3"');
		expect(html).toContain("次へ →");
	});

	test("ページごとにself-canonicalを返す", async () => {
		const { generateMetadata } = await import("./page");
		const metadata = await generateMetadata({
			params: Promise.resolve({ page: "2" }),
		});
		expect(metadata.alternates?.canonical).toBe(
			"https://early-buddhism.j-theravada.com/talks/archive/2",
		);
	});

	test("範囲外ページは404", async () => {
		const { default: TalkArchivePage } = await import("./page");
		await expect(
			TalkArchivePage({ params: Promise.resolve({ page: "999" }) }),
		).rejects.toThrow("not found");
	});
});
