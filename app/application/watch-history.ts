export const WATCH_HISTORY_LIMIT = 200;
export const WATCH_HISTORY_MINIMUM_SECONDS = 30;

const WATCH_HISTORY_TALK_ID_MAX_LENGTH = 200;
const WATCH_HISTORY_TITLE_MAX_LENGTH = 500;
const WATCH_HISTORY_THUMBNAIL_URL_MAX_LENGTH = 2_048;

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

const isValidThumbnailUrl = (value: unknown): value is string | null => {
	if (value === null) return true;
	if (
		typeof value !== "string" ||
		value.length === 0 ||
		value.length > WATCH_HISTORY_THUMBNAIL_URL_MAX_LENGTH
	) {
		return false;
	}

	try {
		const protocol = new URL(value).protocol;
		return protocol === "https:" || protocol === "http:";
	} catch {
		return false;
	}
};

export const isValidWatchHistoryTalkId = (value: unknown): value is string =>
	typeof value === "string" &&
	value.length > 0 &&
	value.length <= WATCH_HISTORY_TALK_ID_MAX_LENGTH;

const isWatchHistorySnapshot = (
	value: unknown,
): value is WatchHistorySnapshot => {
	if (!isRecord(value)) return false;

	return (
		isValidWatchHistoryTalkId(value.talkId) &&
		typeof value.title === "string" &&
		value.title.length > 0 &&
		value.title.length <= WATCH_HISTORY_TITLE_MAX_LENGTH &&
		isValidThumbnailUrl(value.thumbnailUrl) &&
		isNonNegativeFiniteNumber(value.positionSeconds) &&
		(value.durationSeconds === null ||
			(isNonNegativeFiniteNumber(value.durationSeconds) &&
				value.durationSeconds > 0)) &&
		(value.lastWatchedAt === undefined || isValidTimestamp(value.lastWatchedAt))
	);
};

export const parseWatchHistorySnapshot = (
	value: unknown,
): WatchHistorySnapshot | null =>
	isWatchHistorySnapshot(value) ? { ...value } : null;

export const parseWatchHistoryEntry = (
	value: unknown,
): WatchHistoryEntry | null => {
	if (!isRecord(value)) return null;

	const completed = value.completed;
	const lastWatchedAt = value.lastWatchedAt;
	if (
		!isWatchHistorySnapshot(value) ||
		!isValidTimestamp(lastWatchedAt) ||
		typeof completed !== "boolean"
	) {
		return null;
	}

	return {
		completed,
		durationSeconds: value.durationSeconds,
		lastWatchedAt,
		positionSeconds: value.positionSeconds,
		talkId: value.talkId,
		thumbnailUrl: value.thumbnailUrl,
		title: value.title,
	};
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
		!isWatchHistorySnapshot(snapshot) ||
		snapshot.positionSeconds < WATCH_HISTORY_MINIMUM_SECONDS
	) {
		return entries;
	}

	const updated: WatchHistoryEntry = {
		...snapshot,
		lastWatchedAt: new Date(
			snapshot.lastWatchedAt ?? new Date().toISOString(),
		).toISOString(),
		completed: isPlaybackCompleted(
			snapshot.positionSeconds,
			snapshot.durationSeconds,
		),
	};

	return [...entries.filter(({ talkId }) => talkId !== updated.talkId), updated]
		.sort((a, b) => Date.parse(b.lastWatchedAt) - Date.parse(a.lastWatchedAt))
		.slice(0, WATCH_HISTORY_LIMIT);
};

export const getResumeSeconds = (entry: WatchHistoryEntry): number => {
	if (
		!Number.isFinite(entry.positionSeconds) ||
		entry.positionSeconds < WATCH_HISTORY_MINIMUM_SECONDS ||
		entry.completed ||
		isPlaybackCompleted(entry.positionSeconds, entry.durationSeconds)
	) {
		return 0;
	}

	// YouTube start accepts whole seconds; floor only after applying the rewind.
	const resumeSeconds = Math.floor(entry.positionSeconds - 3);
	return Number.isSafeInteger(resumeSeconds) && resumeSeconds > 0
		? resumeSeconds
		: 0;
};
