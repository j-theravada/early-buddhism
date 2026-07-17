import { describe, expect, test } from "bun:test";
import nextConfig from "./next.config";

describe("next config talk listing routes", () => {
	test("rootと番号付き一覧だけに文字起こし検索データをtraceする", () => {
		const searchDocuments = "./app/generated/transcript-search-documents.json";

		expect(nextConfig.outputFileTracingIncludes).toEqual({
			"/talks!(/**)": [searchDocuments],
			"/talks/page/[page]": [searchDocuments],
		});
		expect(nextConfig.outputFileTracingExcludes).toBeUndefined();
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
