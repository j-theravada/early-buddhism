import { buildCanonicalUrl, SITE_NAME, SITE_URL } from "../../utils/seo";

export const ASSOCIATION_ORGANIZATION_ID =
	"https://j-theravada.com/#organization";
export const SITE_DESCRIPTION =
	"日本テーラワーダ仏教協会が運営する、アルボムッレ・スマナサーラ長老の法話デジタルアーカイブ。動画と文字起こしを検索・閲覧できます。";

export type PublisherReference = { "@id": string };

export function buildPublisherReference(): PublisherReference {
	return { "@id": ASSOCIATION_ORGANIZATION_ID };
}

export function buildSiteIdentityJsonLd() {
	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebSite",
				"@id": `${SITE_URL}/#website`,
				name: SITE_NAME,
				url: buildCanonicalUrl("/"),
				description: SITE_DESCRIPTION,
				inLanguage: "ja",
				publisher: buildPublisherReference(),
			},
			{
				"@type": "Organization",
				"@id": ASSOCIATION_ORGANIZATION_ID,
				name: "日本テーラワーダ仏教協会",
				legalName: "宗教法人日本テーラワーダ仏教協会",
				url: "https://j-theravada.com/",
				logo: {
					"@type": "ImageObject",
					url: buildCanonicalUrl("/icon-512.png"),
					width: 512,
					height: 512,
				},
			},
		],
	} as const;
}
