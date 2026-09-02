import { afterAll, describe, expect, test } from "bun:test";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { WatchHistoryEntry } from "../../application/watch-history";
import * as schema from "../database/schema";
import { createWatchHistoryRepository } from "./repository";

const databases: Client[] = [];
const databaseDirectories: string[] = [];

const createRepository = async () => {
	const directory = await mkdtemp(join(tmpdir(), "watch-history-repository-"));
	databaseDirectories.push(directory);
	const database = createClient({
		url: `file:${join(directory, "test.sqlite")}`,
	});
	databases.push(database);
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

afterAll(async () => {
	for (const database of databases) database.close();
	await Promise.all(
		databaseDirectories.map((directory) =>
			rm(directory, { force: true, recursive: true }),
		),
	);
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

	test("旧端末履歴を追加し、既存の新しい履歴は上書きしない", async () => {
		const repository = await createRepository();
		await repository.saveForUser(
			"user_a",
			entry("talk-a", "2026-09-02T00:00:00.000Z", 120),
		);

		await repository.importForUser("user_a", [
			entry("talk-a", "2026-09-01T00:00:00.000Z", 60),
			entry("talk-b", "2026-09-01T00:00:00.000Z", 90),
		]);

		expect(await repository.findForUser("user_a", "talk-a")).toMatchObject({
			lastWatchedAt: "2026-09-02T00:00:00.000Z",
			positionSeconds: 120,
		});
		expect(await repository.findForUser("user_a", "talk-b")).toMatchObject({
			positionSeconds: 90,
		});
	});
});
