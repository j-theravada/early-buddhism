import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	primaryKey,
	real,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

export const userWatchHistory = sqliteTable(
	"user_watch_history",
	{
		userId: text("user_id").notNull(),
		talkId: text("talk_id").notNull(),
		title: text("title").notNull(),
		thumbnailUrl: text("thumbnail_url"),
		positionSeconds: real("position_seconds").notNull(),
		durationSeconds: real("duration_seconds"),
		lastWatchedAt: text("last_watched_at").notNull(),
		completed: integer("completed", { mode: "boolean" }).notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.talkId] }),
		index("user_watch_history_recent").on(table.userId, table.lastWatchedAt),
		check("user_watch_history_title_nonempty", sql`length(${table.title}) > 0`),
		check(
			"user_watch_history_timestamp_nonempty",
			sql`length(${table.lastWatchedAt}) > 0`,
		),
		check(
			"user_watch_history_position_nonnegative",
			sql`${table.positionSeconds} >= 0`,
		),
		check(
			"user_watch_history_duration_positive",
			sql`${table.durationSeconds} IS NULL OR ${table.durationSeconds} > 0`,
		),
		check(
			"user_watch_history_completed_boolean",
			sql`${table.completed} IN (0, 1)`,
		),
	],
);
