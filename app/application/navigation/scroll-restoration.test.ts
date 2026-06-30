import { describe, expect, test } from "bun:test";
import { shouldResetScrollOnRouteChange } from "./scroll-restoration";

describe("shouldResetScrollOnRouteChange", () => {
	test("初回表示ではスクロールを動かさない", () => {
		expect(
			shouldResetScrollOnRouteChange({
				pathname: "/about",
				previousPathname: null,
			}),
		).toBe(false);
	});

	test("pathname が変わったらトップへ戻す", () => {
		expect(
			shouldResetScrollOnRouteChange({
				pathname: "/talks",
				previousPathname: "/about",
			}),
		).toBe(true);
	});

	test("法話詳細から動画一覧へ戻るときは一覧位置の復元を邪魔しない", () => {
		expect(
			shouldResetScrollOnRouteChange({
				pathname: "/talks",
				previousPathname: "/talks/TALK-V-003-1-39D4E83F3DDD",
			}),
		).toBe(false);
	});

	test("query だけの変更ではスクロールを動かさない", () => {
		expect(
			shouldResetScrollOnRouteChange({
				pathname: "/talks",
				previousPathname: "/talks",
			}),
		).toBe(false);
	});
});
