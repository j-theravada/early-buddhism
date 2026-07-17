import { describe, expect, test } from "bun:test";
import nextConfig from "./next.config";

describe("next config talk listing routes", () => {
	test("rootと番号付き一覧の文字起こし検索データをtraceする", () => {
		expect(nextConfig.outputFileTracingIncludes?.["/talks"]).toEqual([
			"./app/generated/transcript-search-documents.json",
		]);
		expect(
			nextConfig.outputFileTracingIncludes?.["/talks/page/[page]"],
		).toEqual(["./app/generated/transcript-search-documents.json"]);
	});

	test("1ページ目の番号付きURLをrootへ恒久リダイレクトする", async () => {
		if (!nextConfig.redirects) throw new Error("Expected redirects config");
		expect(await nextConfig.redirects()).toContainEqual({
			source: "/talks/page/1",
			destination: "/talks",
			permanent: true,
		});
	});
});
