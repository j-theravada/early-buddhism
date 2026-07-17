import { beforeEach, describe, expect, mock, test } from "bun:test";

const notFound = mock(() => {
	throw new Error("not found");
});
const permanentRedirect = mock((href: string) => {
	throw new Error(`permanent redirect: ${href}`);
});

describe("LegacyTalkArchivePage", () => {
	beforeEach(() => {
		notFound.mockClear();
		permanentRedirect.mockClear();
		mock.module("next/navigation", () => ({ notFound, permanentRedirect }));
	});

	test("旧アーカイブ10ページを対応する新一覧へ恒久リダイレクトする", async () => {
		const { default: LegacyTalkArchivePage, generateStaticParams } =
			await import("./page");
		const targets = [
			"/talks",
			"/talks/page/4",
			"/talks/page/7",
			"/talks/page/11",
			"/talks/page/14",
			"/talks/page/17",
			"/talks/page/21",
			"/talks/page/24",
			"/talks/page/27",
			"/talks/page/31",
		];

		for (const [index, target] of targets.entries()) {
			await expect(
				LegacyTalkArchivePage({
					params: Promise.resolve({ page: String(index + 1) }),
				}),
			).rejects.toThrow(`permanent redirect: ${target}`);
		}

		expect(permanentRedirect).toHaveBeenCalledTimes(10);
		expect(permanentRedirect).toHaveBeenNthCalledWith(1, "/talks");
		expect(permanentRedirect).toHaveBeenNthCalledWith(2, "/talks/page/4");
		expect(permanentRedirect).toHaveBeenNthCalledWith(10, "/talks/page/31");
		expect(await generateStaticParams()).toEqual(
			Array.from({ length: 10 }, (_, index) => ({
				page: String(index + 1),
			})),
		);
		expect(notFound).not.toHaveBeenCalled();
	});

	test("非正規表記と範囲外ページを404にする", async () => {
		const { default: LegacyTalkArchivePage } = await import("./page");

		for (const page of ["0", "02", "11", "x"]) {
			await expect(
				LegacyTalkArchivePage({ params: Promise.resolve({ page }) }),
			).rejects.toThrow("not found");
		}

		expect(notFound).toHaveBeenCalledTimes(4);
		expect(permanentRedirect).not.toHaveBeenCalled();
	});
});
