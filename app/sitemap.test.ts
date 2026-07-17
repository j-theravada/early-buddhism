import { expect, test } from "bun:test";
import sitemap from "./sitemap";

test("全アーカイブページと全法話詳細を含む", async () => {
	const entries = await sitemap();
	const urls = entries.map((entry) => entry.url);
	const archiveUrls = urls.filter((url) => url.includes("/talks/archive/"));
	const detailUrls = urls.filter(
		(url) => url.includes("/talks/") && !url.includes("/talks/archive/"),
	);

	expect(archiveUrls).toHaveLength(10);
	expect(detailUrls).toHaveLength(901);
});
