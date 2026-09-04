import { describe, expect, test } from "bun:test";
import { replaceSrtCueText, SrtCueConflictError } from "./srt-editor";

const SRT = [
	"1\r\n",
	"00:00:00,000 --> 00:00:02,000\r\n",
	"変更しない字幕\r\n",
	"\r\n",
	"2\r\n",
	"00:00:02,500 --> 00:00:05,000\r\n",
	"AIの誤変換\r\n",
].join("");

describe("replaceSrtCueText", () => {
	test("対象cueの本文だけを置換して改行と時刻を維持する", () => {
		const result = replaceSrtCueText(SRT, {
			index: 2,
			start: 2.5,
			end: 5,
			text: "AIの誤変換",
			proposedText: "正しい字幕\n二行目",
		});

		expect(result.changed).toBe(true);
		expect(result.content).toBe(
			SRT.replace("AIの誤変換", "正しい字幕\r\n二行目"),
		);
	});

	test("Drive側がすでに提案文なら再実行として扱う", () => {
		const updated = SRT.replace("AIの誤変換", "正しい字幕");
		expect(
			replaceSrtCueText(updated, {
				index: 2,
				start: 2.5,
				end: 5,
				text: "AIの誤変換",
				proposedText: "正しい字幕",
			}),
		).toEqual({ content: updated, changed: false });
	});

	test("本文または時刻が変わっていれば競合にする", () => {
		for (const replacement of [
			{
				index: 2,
				start: 2.5,
				end: 5,
				text: "別の本文",
				proposedText: "正しい字幕",
			},
			{
				index: 2,
				start: 3,
				end: 5,
				text: "AIの誤変換",
				proposedText: "正しい字幕",
			},
		]) {
			expect(() => replaceSrtCueText(SRT, replacement)).toThrow(
				SrtCueConflictError,
			);
		}
	});

	test("同じ番号のcueが複数あれば更新しない", () => {
		expect(() =>
			replaceSrtCueText(`${SRT}\r\n${SRT}`, {
				index: 2,
				start: 2.5,
				end: 5,
				text: "AIの誤変換",
				proposedText: "正しい字幕",
			}),
		).toThrow("同じ番号の字幕が複数あります。");
	});
});
