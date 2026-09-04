CREATE TABLE `transcript_change_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`talk_id` text NOT NULL,
	`drive_file_id` text NOT NULL,
	`cue_index` integer NOT NULL,
	`cue_start` real NOT NULL,
	`cue_end` real NOT NULL,
	`base_text` text NOT NULL,
	`proposed_text` text NOT NULL,
	`reason` text,
	`submitter_user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`reviewer_user_id` text,
	`reviewed_at` text,
	`review_note` text,
	CONSTRAINT "transcript_change_requests_status" CHECK("transcript_change_requests"."status" IN ('pending', 'approved', 'rejected')),
	CONSTRAINT "transcript_change_requests_cue_index_nonnegative" CHECK("transcript_change_requests"."cue_index" >= 0),
	CONSTRAINT "transcript_change_requests_cue_time_valid" CHECK("transcript_change_requests"."cue_start" >= 0 AND "transcript_change_requests"."cue_end" >= "transcript_change_requests"."cue_start"),
	CONSTRAINT "transcript_change_requests_text_nonempty" CHECK(length("transcript_change_requests"."base_text") > 0 AND length("transcript_change_requests"."proposed_text") > 0),
	CONSTRAINT "transcript_change_requests_text_changed" CHECK("transcript_change_requests"."base_text" <> "transcript_change_requests"."proposed_text"),
	CONSTRAINT "transcript_change_requests_review_consistent" CHECK((
				"transcript_change_requests"."status" = 'pending'
				AND "transcript_change_requests"."reviewer_user_id" IS NULL
				AND "transcript_change_requests"."reviewed_at" IS NULL
			) OR (
				"transcript_change_requests"."status" IN ('approved', 'rejected')
				AND "transcript_change_requests"."reviewer_user_id" IS NOT NULL
				AND "transcript_change_requests"."reviewed_at" IS NOT NULL
			))
);
--> statement-breakpoint
CREATE INDEX `transcript_change_requests_pending` ON `transcript_change_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `transcript_change_requests_submitter_talk` ON `transcript_change_requests` (`submitter_user_id`,`talk_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `transcript_change_requests_cue` ON `transcript_change_requests` (`talk_id`,`cue_index`,`status`);