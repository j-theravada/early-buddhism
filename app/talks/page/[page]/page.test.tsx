import { describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { buildTalkGalleryItems } from "../../../application/talk/gallery";
import { TALK_LISTING_PAGE_SIZE } from "../../../application/talk/listing";
import { getTalks } from "../../../infrastructure/talk/repository";

mock.module("next/navigation", () => ({
	notFound: () => {
		throw new Error("not found");
	},
	permanentRedirect: (href: string) => {
		throw new Error(`permanent redirect: ${href}`);
	},
	usePathname: () => "/talks/page/2",
	useRouter: () => ({ back: () => {} }),
}));

function extractTalkDetailIds(html: string): string[] {
	return [
		...new Set(
			Array.from(
				html.matchAll(/href="\/talks\/([^?/"#]+)(?:\?[^"]*)?"/g),
				(match) => decodeURIComponent(match[1] ?? ""),
			),
		),
	];
}

describe("TalkListingNumberedPage", () => {
	test("2ページ目の30件と前後の通常リンクを初期HTMLへ描画する", async () => {
		const { default: TalkListingNumberedPage } = await import("./page");
		const talks = buildTalkGalleryItems(await getTalks());
		const html = renderToStaticMarkup(
			await TalkListingNumberedPage({
				params: Promise.resolve({ page: "2" }),
			}),
		);

		expect(html.match(/data-talk-gallery-item/g)).toHaveLength(
			TALK_LISTING_PAGE_SIZE,
		);
		expect(extractTalkDetailIds(html)).toEqual(
			talks
				.slice(TALK_LISTING_PAGE_SIZE, TALK_LISTING_PAGE_SIZE * 2)
				.map((talk) => talk.id),
		);
		expect(html).toContain('href="/talks"');
		expect(html).toContain('href="/talks/page/3"');
		expect(html).toContain("galleryPage=2");
	});

	test("不正形式と範囲外のページを404にする", async () => {
		const { default: TalkListingNumberedPage } = await import("./page");
		const totalPages = Math.max(
			1,
			Math.ceil((await getTalks()).length / TALK_LISTING_PAGE_SIZE),
		);

		for (const page of ["0", "02", "2.0", String(totalPages + 1)]) {
			await expect(
				TalkListingNumberedPage({ params: Promise.resolve({ page }) }),
			).rejects.toThrow("not found");
		}
	});

	test("2ページ目以降だけを静的生成対象として列挙する", async () => {
		const { generateStaticParams } = await import("./page");
		const totalPages = Math.max(
			1,
			Math.ceil((await getTalks()).length / TALK_LISTING_PAGE_SIZE),
		);

		expect(await generateStaticParams()).toEqual(
			Array.from({ length: totalPages - 1 }, (_, index) => ({
				page: String(index + 2),
			})),
		);
	});

	test("絞り込みなしの2ページ目をself-canonicalにする", async () => {
		const { generateMetadata } = await import("./page");
		const metadata = await generateMetadata({
			params: Promise.resolve({ page: "2" }),
		});

		expect(metadata.alternates?.canonical).toBe(
			"https://early-buddhism.j-theravada.com/talks/page/2",
		);
	});

	test("認識対象の検索・分類・シリーズ条件はnoindexでcanonicalを出さない", async () => {
		const { generateMetadata } = await import("./page");
		const talks = buildTalkGalleryItems(await getTalks());
		const seriesId = talks.find((talk) => talk.seriesId)?.seriesId;
		if (!seriesId) throw new Error("Expected at least one talk series");

		for (const searchParams of [
			{ query: "仏教" },
			{ collection: "monthly_talk" },
			{ series: seriesId },
		]) {
			const metadata = await generateMetadata({
				params: Promise.resolve({ page: "2" }),
				searchParams: Promise.resolve(searchParams),
			});
			expect(metadata.robots).toEqual({ index: false, follow: true });
			expect(metadata.alternates).toBeUndefined();
		}
	});
});
