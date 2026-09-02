import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import {
	WATCH_HISTORY_LIMIT,
	type WatchHistoryEntry,
} from "../../application/watch-history";
import { getDatabase, type Database } from "../database/drizzle";
import { userWatchHistory } from "../database/schema";

export function createWatchHistoryRepository(database: Database) {
	const listForUser = async (userId: string): Promise<WatchHistoryEntry[]> => {
		return database
			.select()
			.from(userWatchHistory)
			.where(eq(userWatchHistory.userId, userId))
			.orderBy(desc(userWatchHistory.lastWatchedAt))
			.limit(WATCH_HISTORY_LIMIT);
	};

	const findForUser = async (
		userId: string,
		talkId: string,
	): Promise<WatchHistoryEntry | null> => {
		const rows = await database
			.select()
			.from(userWatchHistory)
			.where(
				and(
					eq(userWatchHistory.userId, userId),
					eq(userWatchHistory.talkId, talkId),
				),
			)
			.limit(1);

		return rows[0] ?? null;
	};

	const saveForUser = async (
		userId: string,
		entry: WatchHistoryEntry,
	): Promise<WatchHistoryEntry> => {
		const insert = database
			.insert(userWatchHistory)
			.values({ ...entry, userId })
			.onConflictDoUpdate({
				set: {
					completed: entry.completed,
					durationSeconds: entry.durationSeconds,
					lastWatchedAt: entry.lastWatchedAt,
					positionSeconds: entry.positionSeconds,
					thumbnailUrl: entry.thumbnailUrl,
					title: entry.title,
				},
				setWhere: sql`excluded.last_watched_at >= ${userWatchHistory.lastWatchedAt}`,
				target: [userWatchHistory.userId, userWatchHistory.talkId],
			});

		const retainedTalkIds = database
			.select({ talkId: userWatchHistory.talkId })
			.from(userWatchHistory)
			.where(eq(userWatchHistory.userId, userId))
			.orderBy(desc(userWatchHistory.lastWatchedAt))
			.limit(WATCH_HISTORY_LIMIT);
		const trim = database
			.delete(userWatchHistory)
			.where(
				and(
					eq(userWatchHistory.userId, userId),
					notInArray(userWatchHistory.talkId, retainedTalkIds),
				),
			);
		const select = database
			.select()
			.from(userWatchHistory)
			.where(
				and(
					eq(userWatchHistory.userId, userId),
					eq(userWatchHistory.talkId, entry.talkId),
				),
			)
			.limit(1);

		const [, , saved] = await database.batch([insert, trim, select]);
		return saved[0] ?? entry;
	};

	return { findForUser, listForUser, saveForUser };
}

let repository: ReturnType<typeof createWatchHistoryRepository> | null = null;

export function getWatchHistoryRepository() {
	if (!repository) {
		repository = createWatchHistoryRepository(getDatabase());
	}
	return repository;
}
