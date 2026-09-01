import { expect, test } from "bun:test";
import { hasSubtitleAdminRole } from "./subtitle-admin";

test("subtitle_admin ロールだけを字幕管理者として扱う", () => {
	expect(hasSubtitleAdminRole({ role: "subtitle_admin" })).toBe(true);
	expect(hasSubtitleAdminRole({ role: "admin" })).toBe(false);
	expect(hasSubtitleAdminRole({})).toBe(false);
	expect(hasSubtitleAdminRole(null)).toBe(false);
});
