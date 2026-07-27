export const WATCH_HISTORY_LIMIT = 200;
export const WATCH_HISTORY_MINIMUM_SECONDS = 30;
export const WATCH_HISTORY_STORAGE_KEY = "early-buddhism:watch-history:v1";

export type WatchHistoryEntry = {
	talkId: string;
	title: string;
	thumbnailUrl: string | null;
	positionSeconds: number;
	durationSeconds: number | null;
	lastWatchedAt: string;
	completed: boolean;
};

export type WatchHistorySnapshot = Omit<
	WatchHistoryEntry,
	"lastWatchedAt" | "completed"
> & {
	lastWatchedAt?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isNonNegativeFiniteNumber = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value) && value >= 0;

const isValidTimestamp = (value: unknown): value is string =>
	typeof value === "string" &&
	value.length > 0 &&
	Number.isFinite(Date.parse(value));

const isWatchHistoryEntry = (
	key: string,
	value: unknown,
): value is WatchHistoryEntry => {
	if (!isRecord(value)) return false;

	return (
		value.talkId === key &&
		typeof value.talkId === "string" &&
		value.talkId.length > 0 &&
		typeof value.title === "string" &&
		value.title.length > 0 &&
		(value.thumbnailUrl === null || typeof value.thumbnailUrl === "string") &&
		isNonNegativeFiniteNumber(value.positionSeconds) &&
		(value.durationSeconds === null ||
			(isNonNegativeFiniteNumber(value.durationSeconds) &&
				value.durationSeconds > 0)) &&
		isValidTimestamp(value.lastWatchedAt) &&
		typeof value.completed === "boolean"
	);
};

export const parseWatchHistory = (raw: string): WatchHistoryEntry[] => {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!isRecord(parsed)) return [];

		return Object.entries(parsed)
			.filter(([key, value]) => isWatchHistoryEntry(key, value))
			.map(([, value]) => value)
			.sort((a, b) => Date.parse(b.lastWatchedAt) - Date.parse(a.lastWatchedAt))
			.slice(0, WATCH_HISTORY_LIMIT);
	} catch {
		return [];
	}
};

export const isPlaybackCompleted = (
	positionSeconds: number,
	durationSeconds: number | null,
): boolean =>
	isNonNegativeFiniteNumber(positionSeconds) &&
	durationSeconds !== null &&
	Number.isFinite(durationSeconds) &&
	durationSeconds > 0 &&
	positionSeconds / durationSeconds >= 0.9;

export const upsertWatchHistory = (
	entries: WatchHistoryEntry[],
	snapshot: WatchHistorySnapshot,
): WatchHistoryEntry[] => {
	if (
		typeof snapshot.talkId !== "string" ||
		snapshot.talkId.length === 0 ||
		typeof snapshot.title !== "string" ||
		snapshot.title.length === 0 ||
		(snapshot.thumbnailUrl !== null &&
			typeof snapshot.thumbnailUrl !== "string") ||
		!isNonNegativeFiniteNumber(snapshot.positionSeconds) ||
		(snapshot.durationSeconds !== null &&
			(!isNonNegativeFiniteNumber(snapshot.durationSeconds) ||
				snapshot.durationSeconds === 0)) ||
		snapshot.positionSeconds < WATCH_HISTORY_MINIMUM_SECONDS
	) {
		return entries;
	}

	const updated: WatchHistoryEntry = {
		...snapshot,
		lastWatchedAt: snapshot.lastWatchedAt ?? new Date().toISOString(),
		completed: isPlaybackCompleted(
			snapshot.positionSeconds,
			snapshot.durationSeconds,
		),
	};

	return [...entries.filter(({ talkId }) => talkId !== updated.talkId), updated]
		.sort((a, b) => Date.parse(b.lastWatchedAt) - Date.parse(a.lastWatchedAt))
		.slice(0, WATCH_HISTORY_LIMIT);
};

export const getResumeSeconds = (entry: WatchHistoryEntry): number =>
	entry.completed ? 0 : Math.max(0, entry.positionSeconds - 3);
