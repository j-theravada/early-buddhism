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
import type { TranscriptChangeRequestStatus } from "../../application/transcript/change-request";

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

export const transcriptChangeRequests = sqliteTable(
	"transcript_change_requests",
	{
		id: text("id").primaryKey(),
		talkId: text("talk_id").notNull(),
		driveFileId: text("drive_file_id").notNull(),
		cueIndex: integer("cue_index").notNull(),
		cueStart: real("cue_start").notNull(),
		cueEnd: real("cue_end").notNull(),
		baseText: text("base_text").notNull(),
		proposedText: text("proposed_text").notNull(),
		reason: text("reason"),
		submitterUserId: text("submitter_user_id").notNull(),
		status: text("status")
			.$type<TranscriptChangeRequestStatus>()
			.notNull()
			.default("pending"),
		createdAt: text("created_at").notNull(),
		reviewerUserId: text("reviewer_user_id"),
		reviewedAt: text("reviewed_at"),
		reviewNote: text("review_note"),
	},
	(table) => [
		index("transcript_change_requests_pending").on(
			table.status,
			table.createdAt,
		),
		index("transcript_change_requests_submitter_talk").on(
			table.submitterUserId,
			table.talkId,
			table.createdAt,
		),
		index("transcript_change_requests_cue").on(
			table.talkId,
			table.cueIndex,
			table.status,
		),
		check(
			"transcript_change_requests_status",
			sql`${table.status} IN ('pending', 'approved', 'rejected')`,
		),
		check(
			"transcript_change_requests_cue_index_nonnegative",
			sql`${table.cueIndex} >= 0`,
		),
		check(
			"transcript_change_requests_cue_time_valid",
			sql`${table.cueStart} >= 0 AND ${table.cueEnd} >= ${table.cueStart}`,
		),
		check(
			"transcript_change_requests_text_nonempty",
			sql`length(${table.baseText}) > 0 AND length(${table.proposedText}) > 0`,
		),
		check(
			"transcript_change_requests_text_changed",
			sql`${table.baseText} <> ${table.proposedText}`,
		),
		check(
			"transcript_change_requests_review_consistent",
			sql`(
				${table.status} = 'pending'
				AND ${table.reviewerUserId} IS NULL
				AND ${table.reviewedAt} IS NULL
			) OR (
				${table.status} IN ('approved', 'rejected')
				AND ${table.reviewerUserId} IS NOT NULL
				AND ${table.reviewedAt} IS NOT NULL
			)`,
		),
	],
);
