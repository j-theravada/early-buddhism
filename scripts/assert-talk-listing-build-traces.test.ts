import { describe, expect, test } from "bun:test";
import { assertTalkListingTraceContents } from "./assert-talk-listing-build-traces";

const searchDocuments =
	"../../../../app/generated/transcript-search-documents.json";

describe("talk listing build traces", () => {
	test("一覧2ルートだけが文字起こし検索データを含む", () => {
		expect(() =>
			assertTalkListingTraceContents({
				"/talks": { version: 1, files: [searchDocuments] },
				"/talks/page/[page]": { version: 1, files: [searchDocuments] },
				"/talks/[id]": { version: 1, files: [] },
				"/talks/archive/[page]": { version: 1, files: [] },
			}),
		).not.toThrow();
	});

	test("一覧からの欠落を検出する", () => {
		expect(() =>
			assertTalkListingTraceContents({
				"/talks": { version: 1, files: [] },
				"/talks/page/[page]": { version: 1, files: [searchDocuments] },
				"/talks/[id]": { version: 1, files: [] },
				"/talks/archive/[page]": { version: 1, files: [] },
			}),
		).toThrow("/talks must include transcript-search-documents.json");
	});

	test("詳細と旧アーカイブへの混入を検出する", () => {
		for (const route of ["/talks/[id]", "/talks/archive/[page]"] as const) {
			expect(() =>
				assertTalkListingTraceContents({
					"/talks": { version: 1, files: [searchDocuments] },
					"/talks/page/[page]": {
						version: 1,
						files: [searchDocuments],
					},
					"/talks/[id]": {
						version: 1,
						files: route === "/talks/[id]" ? [searchDocuments] : [],
					},
					"/talks/archive/[page]": {
						version: 1,
						files: route === "/talks/archive/[page]" ? [searchDocuments] : [],
					},
				}),
			).toThrow(`${route} must exclude transcript-search-documents.json`);
		}
	});
});
