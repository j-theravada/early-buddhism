import { describe, expect, test } from "bun:test";
import { buildLegacyTalkArchiveRedirectPage } from "./archive-redirect";

describe("legacy talk archive redirect", () => {
	test("901件の旧100件ページを対応する30件ページへ写す", () => {
		expect(
			Array.from({ length: 10 }, (_, index) =>
				buildLegacyTalkArchiveRedirectPage(901, String(index + 1)),
			),
		).toEqual([1, 4, 7, 11, 14, 17, 21, 24, 27, 31]);
	});

	test("非正規表記と範囲外ページを拒否する", () => {
		for (const page of ["0", "02", "11", "x"]) {
			expect(buildLegacyTalkArchiveRedirectPage(901, page)).toBeNull();
		}
	});
});
