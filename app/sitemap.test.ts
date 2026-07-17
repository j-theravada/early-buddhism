import { expect, test } from "bun:test";
import { getTalkArchivePageCount } from "./application/talk/archive";
import {
	buildTalkArchiveHref,
	buildTalkDetailHref,
} from "./application/talk/links";
import { getTalks } from "./infrastructure/talk/repository";
import sitemap from "./sitemap";
import { buildCanonicalUrl } from "./utils/seo";

test("全アーカイブページと全法話詳細を含む", async () => {
	const talks = await getTalks();
	const entries = await sitemap();
	const urls = entries.map((entry) => entry.url);
	const archiveUrls = urls.filter((url) => url.includes("/talks/archive/"));
	const detailUrls = urls.filter(
		(url) => url.includes("/talks/") && !url.includes("/talks/archive/"),
	);
	const archiveUrlSet = new Set(archiveUrls);
	const detailUrlSet = new Set(detailUrls);
	const expectedArchiveUrlSet = new Set(
		Array.from({ length: getTalkArchivePageCount(talks.length) }, (_, index) =>
			buildCanonicalUrl(buildTalkArchiveHref(index + 1)),
		),
	);
	const expectedDetailUrlSet = new Set(
		talks.map((talk) => buildCanonicalUrl(buildTalkDetailHref(talk.id))),
	);

	expect(archiveUrls).toHaveLength(archiveUrlSet.size);
	expect(detailUrls).toHaveLength(detailUrlSet.size);
	expect([...archiveUrlSet].sort()).toEqual([...expectedArchiveUrlSet].sort());
	expect([...detailUrlSet].sort()).toEqual([...expectedDetailUrlSet].sort());
});
