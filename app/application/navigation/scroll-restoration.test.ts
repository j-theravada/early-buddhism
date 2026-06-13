import { describe, expect, test } from "bun:test";
import { shouldRestoreScrollOnRouteChange } from "./scroll-restoration";

describe("shouldRestoreScrollOnRouteChange", () => {
	test("popstate 復帰フラグがあれば復元する", () => {
		expect(
			shouldRestoreScrollOnRouteChange({
				pathname: "/about",
				previousPathname: "/talks/abc",
				restoreOnNextRoute: true,
				isTalkGalleryRestorePending: false,
			}),
		).toBe(true);
	});

	test("トーク詳細から動画一覧に戻ると復元する", () => {
		expect(
			shouldRestoreScrollOnRouteChange({
				pathname: "/talks",
				previousPathname: "/talks/abc",
				restoreOnNextRoute: false,
				isTalkGalleryRestorePending: false,
			}),
		).toBe(true);
	});

	test("ギャラリー復帰待ちのとき動画一覧では復元しない", () => {
		expect(
			shouldRestoreScrollOnRouteChange({
				pathname: "/talks",
				previousPathname: "/talks/abc",
				restoreOnNextRoute: false,
				isTalkGalleryRestorePending: true,
			}),
		).toBe(false);
	});
});
