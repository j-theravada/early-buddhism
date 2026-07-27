import {
	WATCH_HISTORY_STORAGE_KEY,
	parseWatchHistory,
	upsertWatchHistory,
	type WatchHistoryEntry,
	type WatchHistorySnapshot,
} from "../../application/watch-history";

export const readWatchHistory = (): WatchHistoryEntry[] => {
	try {
		const raw = globalThis.localStorage.getItem(WATCH_HISTORY_STORAGE_KEY);
		return raw === null ? [] : parseWatchHistory(raw);
	} catch {
		return [];
	}
};

export const findWatchHistory = (talkId: string): WatchHistoryEntry | null =>
	readWatchHistory().find((entry) => entry.talkId === talkId) ?? null;

export const saveWatchProgress = (
	snapshot: WatchHistorySnapshot,
): WatchHistoryEntry[] => {
	const entries = upsertWatchHistory(readWatchHistory(), snapshot);

	try {
		const persisted = Object.fromEntries(
			entries.map((entry) => [entry.talkId, entry]),
		);
		globalThis.localStorage.setItem(
			WATCH_HISTORY_STORAGE_KEY,
			JSON.stringify(persisted),
		);
	} catch {
		return entries;
	}

	return entries;
};
