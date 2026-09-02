import { describe, expect, test } from "bun:test";
import type { WatchHistoryEntry } from "../../application/watch-history";
import {
	LEGACY_WATCH_HISTORY_STORAGE_KEY,
	migrateLegacyWatchHistoryFromStorage,
	parseLegacyWatchHistory,
} from "./legacy-migration";

const entry: WatchHistoryEntry = {
	completed: false,
	durationSeconds: 120,
	lastWatchedAt: "2026-07-27T00:00:00.000Z",
	positionSeconds: 60,
	talkId: "TALK-1",
	thumbnailUrl: "https://example.com/TALK-1.jpg",
	title: "法話1",
};

const createStorage = (raw: string | null) => {
	let removed = false;
	return {
		storage: {
			getItem: (key: string) =>
				key === LEGACY_WATCH_HISTORY_STORAGE_KEY ? raw : null,
			removeItem: (key: string) => {
				if (key === LEGACY_WATCH_HISTORY_STORAGE_KEY) removed = true;
			},
		},
		wasRemoved: () => removed,
	};
};

describe("legacy watch history migration", () => {
	test("旧形式から有効な履歴だけを読み取る", () => {
		const raw = JSON.stringify({
			[entry.talkId]: entry,
			"wrong-key": entry,
			invalid: { talkId: "invalid" },
		});

		expect(parseLegacyWatchHistory(raw)).toEqual([entry]);
	});

	test("取り込み成功後だけ旧localStorageを削除する", async () => {
		const { storage, wasRemoved } = createStorage(
			JSON.stringify({ [entry.talkId]: entry }),
		);
		let imported: WatchHistoryEntry[] = [];

		await migrateLegacyWatchHistoryFromStorage(storage, async (entries) => {
			imported = entries;
		});

		expect(imported).toEqual([entry]);
		expect(wasRemoved()).toBe(true);
	});

	test("取り込み失敗時は旧localStorageを残す", async () => {
		const { storage, wasRemoved } = createStorage(
			JSON.stringify({ [entry.talkId]: entry }),
		);

		await expect(
			migrateLegacyWatchHistoryFromStorage(storage, async () => {
				throw new Error("import failed");
			}),
		).rejects.toThrow("import failed");
		expect(wasRemoved()).toBe(false);
	});
});
