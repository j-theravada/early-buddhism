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
				previousPathname: "/talks/abc",
			}),
		).toBe(true);
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
