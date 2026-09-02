import {
	parseWatchHistoryEntry,
	type WatchHistoryEntry,
	type WatchHistorySnapshot,
} from "../../application/watch-history";

export async function findWatchHistory(
	talkId: string,
	signal?: AbortSignal,
): Promise<WatchHistoryEntry | null> {
	const response = await fetch(
		`/api/watch-history/${encodeURIComponent(talkId)}`,
		{
			cache: "no-store",
			signal,
		},
	);
	if (response.status === 404) return null;
	if (!response.ok) {
		throw new Error(`Watch history read failed: ${response.status}`);
	}

	return parseWatchHistoryEntry(await response.json());
}

export async function saveWatchProgress(
	snapshot: WatchHistorySnapshot,
): Promise<void> {
	const response = await fetch("/api/watch-history", {
		body: JSON.stringify(snapshot),
		headers: { "Content-Type": "application/json" },
		keepalive: true,
		method: "PUT",
	});
	if (!response.ok) {
		throw new Error(`Watch history save failed: ${response.status}`);
	}
}
