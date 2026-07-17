import { describe, expect, test } from "bun:test";
import { parseScrollPositions } from "./storage";

describe("browser storage helpers", () => {
	test("スクロール位置JSONを安全に解釈する", () => {
		expect(parseScrollPositions('{"/":120,"/about":0}')).toEqual({
			"/": 120,
			"/about": 0,
		});
		expect(parseScrollPositions("invalid")).toEqual({});
	});
});
