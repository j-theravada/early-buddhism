import { expect, test } from "bun:test";
import { TALK_LISTING_PAGE_SIZE } from "./application/talk/listing";
import { buildTalkDetailHref, buildTalksHref } from "./application/talk/links";
import { getTalks } from "./infrastructure/talk/repository";
import sitemap from "./sitemap";
import { buildCanonicalUrl } from "./utils/seo";

test("31件の一覧URLと全901法話詳細だけを重複なく含む", async () => {
	const talks = await getTalks();
	const urls = (await sitemap()).map((entry) => entry.url);
	const totalListingPages = Math.max(
		1,
		Math.ceil(talks.length / TALK_LISTING_PAGE_SIZE),
	);
	const expectedListingUrls = Array.from(
		{ length: totalListingPages },
		(_, index) => buildCanonicalUrl(buildTalksHref({ page: index + 1 })),
	);
	const expectedDetailUrls = talks.map((talk) =>
		buildCanonicalUrl(buildTalkDetailHref(talk.id)),
	);
	const expectedListingUrlSet = new Set(expectedListingUrls);
	const expectedDetailUrlSet = new Set(expectedDetailUrls);
	const listingUrls = urls.filter((url) => expectedListingUrlSet.has(url));
	const detailUrls = urls.filter((url) => expectedDetailUrlSet.has(url));
	const talkUrls = urls.filter((url) =>
		new URL(url).pathname.startsWith("/talks"),
	);
	const expectedTalkUrlSet = new Set([
		...expectedListingUrlSet,
		...expectedDetailUrlSet,
	]);

	expect(talks).toHaveLength(901);
	expect(expectedListingUrls).toHaveLength(31);
	expect(listingUrls).toHaveLength(31);
	expect(detailUrls).toHaveLength(901);
	expect(new Set(listingUrls)).toEqual(expectedListingUrlSet);
	expect(new Set(detailUrls)).toEqual(expectedDetailUrlSet);
	expect(talkUrls).toHaveLength(expectedTalkUrlSet.size);
	expect(new Set(talkUrls)).toEqual(expectedTalkUrlSet);
	expect(urls.some((url) => url.includes("/talks/archive/"))).toBeFalse();
	expect(urls.some((url) => new URL(url).search)).toBeFalse();
});
