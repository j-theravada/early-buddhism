import type { MetadataRoute } from "next";
import { getTalkArchivePageCount } from "./application/talk/archive";
import {
	buildTalkArchiveHref,
	buildTalkDetailHref,
} from "./application/talk/links";
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
	const archivePages: MetadataRoute.Sitemap = Array.from(
		{ length: getTalkArchivePageCount(talks.length) },
		(_, index) => ({
			url: buildCanonicalUrl(buildTalkArchiveHref(index + 1)),
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

	return [...staticPages, ...archivePages, ...talkPages];
}
