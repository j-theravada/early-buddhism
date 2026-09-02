// Legacy localStorage JSON is decoded here before migration into WatchHistoryEntry.
/* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-unsafe-dictionary-type */
import {
	WATCH_HISTORY_LIMIT,
	parseWatchHistoryEntry,
	type WatchHistoryEntry,
} from "../../application/watch-history";
import { importWatchHistory } from "./client";

export const LEGACY_WATCH_HISTORY_STORAGE_KEY =
	"early-buddhism:watch-history:v1";

type LegacyStorage = Pick<Storage, "getItem" | "removeItem">;
type HistoryImporter = (entries: WatchHistoryEntry[]) => Promise<void>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export function parseLegacyWatchHistory(raw: string): WatchHistoryEntry[] {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!isRecord(parsed)) return [];

		return Object.entries(parsed)
			.flatMap(([talkId, candidate]) => {
				const entry = parseWatchHistoryEntry(candidate);
				return entry?.talkId === talkId ? [entry] : [];
			})
			.sort((a, b) => Date.parse(b.lastWatchedAt) - Date.parse(a.lastWatchedAt))
			.slice(0, WATCH_HISTORY_LIMIT);
	} catch {
		return [];
	}
}

export async function migrateLegacyWatchHistoryFromStorage(
	storage: LegacyStorage,
	importer: HistoryImporter,
): Promise<number> {
	let raw: string | null;
	try {
		raw = storage.getItem(LEGACY_WATCH_HISTORY_STORAGE_KEY);
	} catch {
		return 0;
	}
	if (raw === null) return 0;

	const entries = parseLegacyWatchHistory(raw);
	if (entries.length > 0) {
		await importer(entries);
	}

	try {
		storage.removeItem(LEGACY_WATCH_HISTORY_STORAGE_KEY);
	} catch {
		// Re-importing the same entries is safe because the server keeps newer rows.
	}
	return entries.length;
}

let migrationPromise: Promise<number> | null = null;

export function migrateLegacyWatchHistory(): Promise<number> {
	if (!migrationPromise) {
		let storage: Storage;
		try {
			storage = globalThis.localStorage;
		} catch {
			return Promise.resolve(0);
		}

		migrationPromise = migrateLegacyWatchHistoryFromStorage(
			storage,
			importWatchHistory,
		).catch((cause: unknown) => {
			migrationPromise = null;
			throw cause;
		});
	}
	return migrationPromise;
}
