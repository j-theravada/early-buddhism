import { describe, expect, test } from "bun:test";
import {
	ASSOCIATION_ORGANIZATION_ID,
	buildPublisherReference,
	buildSiteIdentityJsonLd,
	SITE_DESCRIPTION,
} from "./site-identity";

describe("site identity structured data", () => {
	test("初期仏教塾と運営組織を別エンティティとして結ぶ", () => {
		const result = buildSiteIdentityJsonLd();
		const website = result["@graph"][0];
		const organization = result["@graph"][1];

		expect(website.name).toBe("初期仏教塾");
		expect(website.publisher).toEqual({
			"@id": ASSOCIATION_ORGANIZATION_ID,
		});
		expect(organization["@id"]).toBe(ASSOCIATION_ORGANIZATION_ID);
		expect(organization.name).toBe("日本テーラワーダ仏教協会");
		expect(organization.legalName).toBe("宗教法人日本テーラワーダ仏教協会");
		expect(organization.name).not.toBe("初期仏教塾");
		expect(organization.logo).toMatchObject({ width: 512, height: 512 });
	});

	test("共通説明とpublisher参照を一か所から返す", () => {
		expect(SITE_DESCRIPTION).toContain("日本テーラワーダ仏教協会が運営");
		expect(SITE_DESCRIPTION).toContain("動画と文字起こし");
		expect(SITE_DESCRIPTION).not.toContain("音声");
		expect(buildPublisherReference()).toEqual({
			"@id": ASSOCIATION_ORGANIZATION_ID,
		});
	});
});
