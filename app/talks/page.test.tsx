import { expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { getTalkArchivePageCount } from "../application/talk/archive";
import { buildTalkGalleryItems } from "../application/talk/gallery";
import {
	buildTalkArchiveHref,
	buildTalkDetailHref,
} from "../application/talk/links";
import { getTalks } from "../infrastructure/talk/repository";

mock.module("next/navigation", () => ({
	notFound: () => {
		throw new Error("not found");
	},
	usePathname: () => "/talks",
	useRouter: () => ({ back: () => {} }),
}));

function extractHrefs(html: string): string[] {
	return Array.from(html.matchAll(/href="([^"]+)"/g), (match) => match[1]);
}

function extractTalkDetailHrefs(html: string): string[] {
	return extractHrefs(html).filter(
		(href) => href.startsWith("/talks/") && !href.startsWith("/talks/archive/"),
	);
}

function parseArchivePageHref(href: string): number {
	const match = href.match(/^\/talks\/archive\/(\d+)$/);
	if (!match) throw new Error(`Unexpected archive href: ${href}`);
	return Number(match[1]);
}

test("全法話を動画一覧から2クリック以内の通常リンクでたどれる", async () => {
	const [{ default: TalksPage }, { default: TalkArchivePage }] =
		await Promise.all([import("./page"), import("./archive/[page]/page")]);
	const talks = buildTalkGalleryItems(await getTalks());
	const expectedDetailHrefs = talks.map((talk) => buildTalkDetailHref(talk.id));
	const expectedArchiveHrefs = Array.from(
		{ length: getTalkArchivePageCount(talks.length) },
		(_, index) => buildTalkArchiveHref(index + 1),
	);
	const talksHtml = renderToStaticMarkup(await TalksPage());
	const talksHrefs = extractHrefs(talksHtml);
	const previewDetailHrefs = extractTalkDetailHrefs(talksHtml);
	const linkedArchiveHrefs = new Set(
		talksHrefs.filter((href) => href.startsWith("/talks/archive/")),
	);

	expect(previewDetailHrefs).toEqual(expectedDetailHrefs.slice(0, 6));
	expect([...linkedArchiveHrefs].sort()).toEqual(
		[...expectedArchiveHrefs].sort(),
	);
	expect(talksHtml).toContain("全法話をページ一覧で見る");

	const linkedArchivePages = [...linkedArchiveHrefs]
		.map(parseArchivePageHref)
		.sort((left, right) => left - right);
	const archiveDetailHrefs = (
		await Promise.all(
			linkedArchivePages.map(async (page) =>
				extractTalkDetailHrefs(
					renderToStaticMarkup(
						await TalkArchivePage({
							params: Promise.resolve({ page: String(page) }),
						}),
					),
				),
			),
		)
	).flat();
	const reachableWithinTwoClicks = new Set([
		...previewDetailHrefs,
		...archiveDetailHrefs,
	]);

	expect(archiveDetailHrefs).toEqual(expectedDetailHrefs);
	expect([...reachableWithinTwoClicks].sort()).toEqual(
		[...expectedDetailHrefs].sort(),
	);
});
