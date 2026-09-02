import { afterEach, describe, expect, test } from "bun:test";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import type { WatchHistoryEntry } from "../../application/watch-history";
import * as schema from "../database/schema";
import { createWatchHistoryRepository } from "./repository";

let database: Client | null = null;

const createRepository = async () => {
	database = createClient({ url: "file::memory:" });
	const orm = drizzle({ client: database, schema });
	await migrate(orm, { migrationsFolder: "./drizzle" });
	return createWatchHistoryRepository(orm);
};

const entry = (
	talkId: string,
	lastWatchedAt: string,
	positionSeconds = 60,
): WatchHistoryEntry => ({
	completed: false,
	durationSeconds: 600,
	lastWatchedAt,
	positionSeconds,
	talkId,
	thumbnailUrl: `https://example.com/${talkId}.jpg`,
	title: `法話 ${talkId}`,
});

afterEach(() => {
	database?.close();
	database = null;
});

describe("watch history repository", () => {
	test("Clerk user ID ごとに履歴を分離する", async () => {
		const repository = await createRepository();
		await repository.saveForUser(
			"user_a",
			entry("talk-a", "2026-09-01T00:00:00.000Z"),
		);
		await repository.saveForUser(
			"user_b",
			entry("talk-b", "2026-09-02T00:00:00.000Z"),
		);

		expect(
			(await repository.listForUser("user_a")).map((x) => x.talkId),
		).toEqual(["talk-a"]);
		expect(await repository.findForUser("user_a", "talk-b")).toBeNull();
	});

	test("遅れて到着した古い保存で新しい再生位置を戻さない", async () => {
		const repository = await createRepository();
		await repository.saveForUser(
			"user_a",
			entry("talk-a", "2026-09-02T00:00:00.000Z", 120),
		);
		await repository.saveForUser(
			"user_a",
			entry("talk-a", "2026-09-01T00:00:00.000Z", 60),
		);

		expect(await repository.findForUser("user_a", "talk-a")).toMatchObject({
			lastWatchedAt: "2026-09-02T00:00:00.000Z",
			positionSeconds: 120,
		});
	});
});
