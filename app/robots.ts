import type { MetadataRoute } from "next";
import { buildCanonicalUrl } from "./utils/seo";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
		},
		sitemap: buildCanonicalUrl("/sitemap.xml"),
	};
}
