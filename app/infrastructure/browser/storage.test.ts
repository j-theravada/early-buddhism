import { describe, expect, test } from "bun:test";
import { parseScrollPositions, parseVirtuosoRestoreSnapshot } from "./storage";

describe("browser storage helpers", () => {
	test("スクロール位置JSONを安全に解釈する", () => {
		expect(parseScrollPositions('{"/":120,"/about":0}')).toEqual({
			"/": 120,
			"/about": 0,
		});
		expect(parseScrollPositions("invalid")).toEqual({});
	});

	test("復帰待ちでない場合はvirtuoso snapshotを返さない", () => {
		expect(
			parseVirtuosoRestoreSnapshot('{"foo":"bar"}', false),
		).toBeUndefined();
	});

	test("復帰待ちなら JSON snapshot を返す", () => {
		expect(parseVirtuosoRestoreSnapshot('{"foo":"bar"}', true)).toEqual({
			foo: "bar",
		});
		expect(parseVirtuosoRestoreSnapshot("invalid", true)).toBeUndefined();
	});
});
