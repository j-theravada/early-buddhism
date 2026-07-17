import { describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { buildTalkGalleryItems } from "../application/talk/gallery";
import { TALK_LISTING_PAGE_SIZE } from "../application/talk/listing";
import { getTalks } from "../infrastructure/talk/repository";

mock.module("next/navigation", () => ({
	notFound: () => {
		throw new Error("not found");
	},
	usePathname: () => "/talks",
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

describe("TalksPage", () => {
	test("最初の30件とGET検索フォームを初期HTMLへ直接描画する", async () => {
		const { default: TalksPage } = await import("./page");
		const talks = buildTalkGalleryItems(await getTalks());
		const html = renderToStaticMarkup(await TalksPage({}));

		expect(html.match(/data-talk-gallery-item/g)).toHaveLength(
			TALK_LISTING_PAGE_SIZE,
		);
		expect(extractTalkDetailIds(html)).toEqual(
			talks.slice(0, TALK_LISTING_PAGE_SIZE).map((talk) => talk.id),
		);
		expect(html).toContain('action="/talks"');
		expect(html).toContain('method="get"');
		expect(html).toContain('name="query"');
		expect(html).not.toContain("続きを読み込んでいます。");
		expect(html).not.toContain("検索と全件表示を読み込み中です。");
	});

	test("絞り込みなしはself-canonical、条件ありはnoindexでcanonicalを出さない", async () => {
		const { generateMetadata } = await import("./page");
		const unfiltered = await generateMetadata({});
		const filtered = await generateMetadata({
			searchParams: Promise.resolve({ query: "仏教" }),
		});

		expect(unfiltered.alternates?.canonical).toBe(
			"https://early-buddhism.j-theravada.com/talks",
		);
		expect(filtered.robots).toEqual({ index: false, follow: true });
		expect(filtered.alternates).toBeUndefined();
	});
});
