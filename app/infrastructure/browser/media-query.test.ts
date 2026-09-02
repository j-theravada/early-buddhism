// Partial MediaQueryList fakes intentionally omit unrelated browser members.
/* oxlint-disable anti-slop/no-chained-type-assertions, anti-slop/require-safety-comment-for-type-assertion */
import { describe, expect, test } from "bun:test";
import { addMediaQueryChangeListener } from "./media-query";

describe("addMediaQueryChangeListener", () => {
	test("modern MediaQueryList listeners are removed with addEventListener API", () => {
		const calls: string[] = [];
		const mediaQuery = {
			addEventListener: (event: string) => calls.push(`add:${event}`),
			removeEventListener: (event: string) => calls.push(`remove:${event}`),
		} as unknown as MediaQueryList;

		const remove = addMediaQueryChangeListener(mediaQuery, () => {});
		remove();

		expect(calls).toEqual(["add:change", "remove:change"]);
	});

	test("legacy MediaQueryList listeners are removed with addListener API", () => {
		const calls: string[] = [];
		const mediaQuery = {
			addListener: () => calls.push("add"),
			removeListener: () => calls.push("remove"),
		} as unknown as MediaQueryList;

		const remove = addMediaQueryChangeListener(mediaQuery, () => {});
		remove();

		expect(calls).toEqual(["add", "remove"]);
	});
});
