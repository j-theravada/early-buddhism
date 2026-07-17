import type { MetadataRoute } from "next";
import { TALK_LISTING_PAGE_SIZE } from "./application/talk/listing";
import { buildTalkDetailHref, buildTalksHref } from "./application/talk/links";
import { getTalks } from "./infrastructure/talk/repository";
import { buildCanonicalUrl } from "./utils/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const staticPages: MetadataRoute.Sitemap = [
		{ url: buildCanonicalUrl("/"), changeFrequency: "weekly", priority: 1 },
		{
			url: buildCanonicalUrl("/talks"),
			changeFrequency: "weekly",
			priority: 0.8,
		},
		{
			url: buildCanonicalUrl("/about"),
			changeFrequency: "monthly",
			priority: 0.7,
		},
		{
			url: buildCanonicalUrl("/about/sumanasara"),
			changeFrequency: "monthly",
			priority: 0.7,
		},
		{
			url: buildCanonicalUrl("/about/early-buddhism"),
			changeFrequency: "monthly",
			priority: 0.7,
		},
		{
			url: buildCanonicalUrl("/about/vipassana"),
			changeFrequency: "monthly",
			priority: 0.7,
		},
	];

	const talks = await getTalks();
	const totalListingPages = Math.max(
		1,
		Math.ceil(talks.length / TALK_LISTING_PAGE_SIZE),
	);
	const listingPages: MetadataRoute.Sitemap = Array.from(
		{ length: Math.max(0, totalListingPages - 1) },
		(_, index) => ({
			url: buildCanonicalUrl(buildTalksHref({ page: index + 2 })),
			changeFrequency: "weekly",
			priority: 0.5,
		}),
	);
	const talkPages: MetadataRoute.Sitemap = talks.map((talk) => ({
		url: buildCanonicalUrl(buildTalkDetailHref(talk.id)),
		...(talk.recordedOnDate && { lastModified: talk.recordedOnDate }),
		changeFrequency: "monthly",
		priority: 0.6,
	}));

	return [...staticPages, ...listingPages, ...talkPages];
}
