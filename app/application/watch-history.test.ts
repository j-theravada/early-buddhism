import { describe, expect, test } from "bun:test";
import {
	WATCH_HISTORY_LIMIT,
	WATCH_HISTORY_MINIMUM_SECONDS,
	getResumeSeconds,
	isPlaybackCompleted,
	parseWatchHistory,
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

describe("parseWatchHistory", () => {
	test("returns an empty list for malformed JSON", () => {
		expect(parseWatchHistory("invalid")).toEqual([]);
	});

	test("discards malformed records and accepts only an object keyed by talk ID", () => {
		const valid = { ...entry };
		const raw = JSON.stringify({
			[entry.talkId]: valid,
			wrongKey: valid,
			badFields: { ...valid, positionSeconds: "60" },
			badThumbnail: { ...valid, thumbnailUrl: 42 },
			badDuration: { ...valid, durationSeconds: 0 },
			badDate: { ...valid, lastWatchedAt: "not-a-date" },
			badCompleted: { ...valid, completed: "false" },
		});

		expect(parseWatchHistory(raw)).toEqual([entry]);
		expect(parseWatchHistory(JSON.stringify([]))).toEqual([]);
	});

	test("sorts valid records newest first", () => {
		const older = {
			...entry,
			talkId: "older",
			lastWatchedAt: "2026-07-26T00:00:00.000Z",
		};
		const newer = {
			...entry,
			talkId: "newer",
			lastWatchedAt: "2026-07-28T00:00:00.000Z",
		};

		expect(parseWatchHistory(JSON.stringify({ older, newer }))).toEqual([
			newer,
			older,
		]);
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

	test("rewinds incomplete playback by three seconds and resets completed playback", () => {
		expect(getResumeSeconds({ ...entry, positionSeconds: 125 })).toBe(122);
		expect(getResumeSeconds({ ...entry, positionSeconds: 2 })).toBe(0);
		expect(getResumeSeconds({ ...entry, completed: true })).toBe(0);
	});
});
