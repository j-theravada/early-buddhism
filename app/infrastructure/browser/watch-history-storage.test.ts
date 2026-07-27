import { afterEach, describe, expect, test } from "bun:test";
import {
	WATCH_HISTORY_STORAGE_KEY,
	type WatchHistoryEntry,
	type WatchHistorySnapshot,
} from "../../application/watch-history";
import {
	findWatchHistory,
	readWatchHistory,
	saveWatchProgress,
} from "./watch-history-storage";

const snapshot: WatchHistorySnapshot = {
	talkId: "talk-1",
	title: "A talk",
	thumbnailUrl: "https://example.com/thumb.jpg",
	positionSeconds: 45,
	durationSeconds: 100,
	lastWatchedAt: "2026-07-27T00:00:00.000Z",
};

const installStorage = (
	initialValue: string | null = null,
	methods: Partial<Storage> = {},
) => {
	let value = initialValue;
	const setItemCalls: Array<[string, string]> = [];
	const storage = {
		getItem: () => value,
		setItem: (key: string, nextValue: string) => {
			setItemCalls.push([key, nextValue]);
			value = nextValue;
		},
		removeItem: () => {},
		clear: () => {},
		key: () => null,
		length: 0,
		setItemCalls,
		...methods,
	} as Storage;

	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		value: storage,
	});

	return storage;
};

afterEach(() => {
	Reflect.deleteProperty(globalThis, "localStorage");
});

describe("watch history storage", () => {
	test("returns an empty list when storage has no history", () => {
		installStorage();

		expect(readWatchHistory()).toEqual([]);
	});

	test("round trips saved progress and finds it by talk ID", () => {
		installStorage();

		const saved = saveWatchProgress(snapshot);

		expect(saved).toHaveLength(1);
		expect(findWatchHistory(snapshot.talkId)?.positionSeconds).toBe(45);
		expect(readWatchHistory()).toEqual(saved);
	});

	test("replaces the existing entry for the same talk", () => {
		installStorage();
		saveWatchProgress(snapshot);

		const replacement = saveWatchProgress({
			...snapshot,
			positionSeconds: 90,
			lastWatchedAt: "2026-07-28T00:00:00.000Z",
		});

		expect(replacement).toHaveLength(1);
		expect(replacement[0]?.positionSeconds).toBe(90);
	});

	test("persists entries as an object keyed by talk ID", () => {
		const storage = installStorage();

		saveWatchProgress(snapshot);

		expect(storage.setItemCalls).toEqual([
			[
				WATCH_HISTORY_STORAGE_KEY,
				JSON.stringify({
					[snapshot.talkId]: {
						...snapshot,
						completed: false,
					},
				}),
			],
		]);
	});

	test("swallows localStorage read exceptions", () => {
		installStorage(null, {
			getItem: () => {
				throw new Error("blocked");
			},
		});

		expect(readWatchHistory()).toEqual([]);
		expect(findWatchHistory(snapshot.talkId)).toBeNull();
	});

	test("swallows localStorage write exceptions and returns the computed list", () => {
		installStorage(null, {
			setItem: () => {
				throw new Error("blocked");
			},
		});

		expect(() => saveWatchProgress(snapshot)).not.toThrow();
		expect(saveWatchProgress(snapshot)).toEqual([
			{
				...snapshot,
				lastWatchedAt: snapshot.lastWatchedAt!,
				completed: false,
			},
		] satisfies WatchHistoryEntry[]);
	});
});
