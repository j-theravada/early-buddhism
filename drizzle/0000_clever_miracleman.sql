CREATE TABLE `user_watch_history` (
	`user_id` text NOT NULL,
	`talk_id` text NOT NULL,
	`title` text NOT NULL,
	`thumbnail_url` text,
	`position_seconds` real NOT NULL,
	`duration_seconds` real,
	`last_watched_at` text NOT NULL,
	`completed` integer NOT NULL,
	PRIMARY KEY(`user_id`, `talk_id`),
	CONSTRAINT "user_watch_history_title_nonempty" CHECK(length("user_watch_history"."title") > 0),
	CONSTRAINT "user_watch_history_timestamp_nonempty" CHECK(length("user_watch_history"."last_watched_at") > 0),
	CONSTRAINT "user_watch_history_position_nonnegative" CHECK("user_watch_history"."position_seconds" >= 0),
	CONSTRAINT "user_watch_history_duration_positive" CHECK("user_watch_history"."duration_seconds" IS NULL OR "user_watch_history"."duration_seconds" > 0),
	CONSTRAINT "user_watch_history_completed_boolean" CHECK("user_watch_history"."completed" IN (0, 1))
);
--> statement-breakpoint
CREATE INDEX `user_watch_history_recent` ON `user_watch_history` (`user_id`,`last_watched_at`);