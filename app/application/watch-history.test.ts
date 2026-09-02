import { describe, expect, test } from "bun:test";
import {
	WATCH_HISTORY_LIMIT,
	WATCH_HISTORY_MINIMUM_SECONDS,
	getResumeSeconds,
	isPlaybackCompleted,
	isValidWatchHistoryTalkId,
	parseWatchHistoryEntries,
	parseWatchHistoryEntry,
	parseWatchHistorySnapshot,
	upsertWatchHistory,
	type WatchHistoryEntry,
	type WatchHistorySnapshot,
} from "./watch-history";

const entry: WatchHistoryEntry = {
	talkId: "talk-1",
	title: "A talk",
	thumbnailUrl: "https://example.com/thumb.jpg",
	positionSeconds: 60,
	durationSeconds: 100,
	lastWatchedAt: "2026-07-27T00:00:00.000Z",
	completed: false,
};

const snapshot: WatchHistorySnapshot = {
	talkId: entry.talkId,
	title: entry.title,
	thumbnailUrl: entry.thumbnailUrl,
	positionSeconds: entry.positionSeconds,
	durationSeconds: entry.durationSeconds,
	lastWatchedAt: entry.lastWatchedAt,
};

describe("watch history parsing", () => {
	test("API入力から有効な再生スナップショットだけを受け付ける", () => {
		expect(isValidWatchHistoryTalkId(snapshot.talkId)).toBe(true);
		expect(isValidWatchHistoryTalkId("")).toBe(false);
		expect(parseWatchHistorySnapshot(snapshot)).toEqual(snapshot);
		expect(
			parseWatchHistorySnapshot({ ...snapshot, positionSeconds: "60" }),
		).toBeNull();
		expect(
			parseWatchHistorySnapshot({ ...snapshot, thumbnailUrl: "javascript:x" }),
		).toBeNull();
		expect(
			parseWatchHistorySnapshot({ ...snapshot, durationSeconds: 0 }),
		).toBeNull();
	});

	test("API応答から完全な履歴だけを受け付ける", () => {
		expect(parseWatchHistoryEntry(entry)).toEqual(entry);
		expect(parseWatchHistoryEntries([entry])).toEqual([entry]);
		expect(
			parseWatchHistoryEntries([{ ...entry, completed: "false" }]),
		).toBeNull();
		expect(parseWatchHistoryEntry({ ...entry, completed: "false" })).toBeNull();
		expect(
			parseWatchHistoryEntry({ ...entry, lastWatchedAt: "not-a-date" }),
		).toBeNull();
	});
});

describe("upsertWatchHistory", () => {
	test("rejects positions below the 30-second minimum", () => {
		expect(WATCH_HISTORY_MINIMUM_SECONDS).toBe(30);
		expect(
			upsertWatchHistory([], { ...snapshot, positionSeconds: 29 }),
		).toEqual([]);
	});

	test("replaces an existing talk and keeps the newest-first order", () => {
		const existing = {
			...entry,
			positionSeconds: 40,
			lastWatchedAt: "2026-07-26T00:00:00.000Z",
		};
		const updated = {
			...snapshot,
			positionSeconds: 90,
			lastWatchedAt: "2026-07-28T00:00:00.000Z",
		};

		expect(upsertWatchHistory([existing], updated)).toEqual([
			{
				...entry,
				positionSeconds: 90,
				lastWatchedAt: updated.lastWatchedAt,
				completed: true,
			},
		]);
	});

	test("retains at most 200 entries", () => {
		const entries = Array.from({ length: 200 }, (_, index) => ({
			...entry,
			talkId: `talk-${index}`,
			lastWatchedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
		}));

		const result = upsertWatchHistory(entries, {
			...snapshot,
			talkId: "new-talk",
			lastWatchedAt: "2026-12-31T00:00:00.000Z",
		});

		expect(result).toHaveLength(WATCH_HISTORY_LIMIT);
		expect(result[0]?.talkId).toBe("new-talk");
		expect(result.some(({ talkId }) => talkId === "talk-0")).toBe(false);
	});
});

describe("playback rules", () => {
	test("completes playback at 90 percent and not before", () => {
		expect(isPlaybackCompleted(89, 100)).toBe(false);
		expect(isPlaybackCompleted(90, 100)).toBe(true);
		expect(isPlaybackCompleted(90, null)).toBe(false);
		expect(isPlaybackCompleted(90, 0)).toBe(false);
	});

	test("rewinds normal incomplete playback by three seconds", () => {
		expect(getResumeSeconds({ ...entry, positionSeconds: 63 })).toBe(60);
	});

	test("floors fractional resume positions after the three-second rewind", () => {
		expect(getResumeSeconds({ ...entry, positionSeconds: 63.9 })).toBe(60);
	});

	test("resets positions below the 30-second history minimum", () => {
		expect(getResumeSeconds({ ...entry, positionSeconds: 29.9 })).toBe(0);
	});

	test("resets entries marked completed", () => {
		expect(getResumeSeconds({ ...entry, completed: true })).toBe(0);
	});

	test("resets an inconsistent incomplete entry at exactly 90 percent", () => {
		expect(
			getResumeSeconds({
				...entry,
				completed: false,
				durationSeconds: 100,
				positionSeconds: 90,
			}),
		).toBe(0);
	});

	test("resets an out-of-duration position even when completed is false", () => {
		expect(
			getResumeSeconds({
				...entry,
				completed: false,
				durationSeconds: 100,
				positionSeconds: 125,
			}),
		).toBe(0);
	});

	test("resumes an incomplete entry when duration is unavailable", () => {
		expect(
			getResumeSeconds({
				...entry,
				durationSeconds: null,
				positionSeconds: 63,
			}),
		).toBe(60);
	});

	test("resets non-finite positions supplied directly", () => {
		expect(getResumeSeconds({ ...entry, positionSeconds: Number.NaN })).toBe(0);
		expect(
			getResumeSeconds({ ...entry, positionSeconds: Number.POSITIVE_INFINITY }),
		).toBe(0);
	});
});
