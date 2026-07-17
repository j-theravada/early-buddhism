import { describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { buildTalkGalleryItems } from "../../../application/talk/gallery";
import { buildTalkDetailHref } from "../../../application/talk/links";
import { getTalks } from "../../../infrastructure/talk/repository";

mock.module("next/navigation", () => ({
	notFound: () => {
		throw new Error("not found");
	},
}));

function extractTalkDetailHrefs(html: string): string[] {
	return Array.from(
		html.matchAll(/href="(\/talks\/(?!archive\/)[^"]+)"/g),
		(match) => match[1],
	);
}

describe("TalkArchivePage", () => {
	test("各ページの全法話を通常リンクで出して静的生成対象を列挙する", async () => {
		const { default: TalkArchivePage, generateStaticParams } =
			await import("./page");
		const talks = buildTalkGalleryItems(await getTalks());
		const firstPageHtml = renderToStaticMarkup(
			await TalkArchivePage({ params: Promise.resolve({ page: "1" }) }),
		);
		const finalPageHtml = renderToStaticMarkup(
			await TalkArchivePage({ params: Promise.resolve({ page: "10" }) }),
		);
		const params = await generateStaticParams();
		const firstPageHrefs = extractTalkDetailHrefs(firstPageHtml);
		const finalPageHrefs = extractTalkDetailHrefs(finalPageHtml);

		expect(firstPageHrefs).toHaveLength(100);
		expect(firstPageHrefs).toEqual(
			talks.slice(0, 100).map((talk) => buildTalkDetailHref(talk.id)),
		);
		expect(finalPageHrefs).toHaveLength(talks.length - 900);
		expect(finalPageHrefs).toEqual(
			talks.slice(900).map((talk) => buildTalkDetailHref(talk.id)),
		);
		expect(firstPageHtml).toContain('href="/talks/archive/10"');
		expect(params).toEqual(
			Array.from({ length: 10 }, (_, index) => ({
				page: String(index + 1),
			})),
		);
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
