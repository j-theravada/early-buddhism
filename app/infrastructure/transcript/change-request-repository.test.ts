import { createClient, type Client } from "@libsql/client";
import { afterAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TranscriptChangeRequest } from "../../application/transcript/change-request";
import * as schema from "../database/schema";
import { createTranscriptChangeRequestRepository } from "./change-request-repository";

const databases: Client[] = [];
const databaseDirectories: string[] = [];

async function createRepository() {
	const directory = await mkdtemp(join(tmpdir(), "transcript-requests-"));
	databaseDirectories.push(directory);
	const client = createClient({
		url: `file:${join(directory, "test.sqlite")}`,
	});
	databases.push(client);
	const database = drizzle({ client, schema });
	await migrate(database, { migrationsFolder: "./drizzle" });
	return createTranscriptChangeRequestRepository(database);
}

function createRequest(
	id: string,
	submitterUserId: string,
	cueIndex: number,
): TranscriptChangeRequest {
	return {
		id,
		talkId: "TALK-1",
		driveFileId: "FILE-1",
		cueIndex,
		cueStart: cueIndex,
		cueEnd: cueIndex + 1,
		baseText: `元字幕${id}`,
		proposedText: `修正字幕${id}`,
		reason: null,
		submitterUserId,
		status: "pending",
		createdAt: `2026-09-03T00:00:0${cueIndex}.000Z`,
		reviewerUserId: null,
		reviewedAt: null,
		reviewNote: null,
	};
}

afterAll(async () => {
	for (const database of databases) database.close();
	await Promise.all(
		databaseDirectories.map((directory) =>
			rm(directory, { force: true, recursive: true }),
		),
	);
});

describe("transcript change request repository", () => {
	test("申請者と法話ごとに申請を返す", async () => {
		const repository = await createRepository();
		await repository.create(createRequest("a", "user-a", 1));
		await repository.create(createRequest("b", "user-b", 2));

		expect(
			(await repository.listForUserTalk("user-a", "TALK-1")).map(
				(request) => request.id,
			),
		).toEqual(["a"]);
	});

	test("一件の承認時に同じcueの他申請を却下する", async () => {
		const repository = await createRepository();
		await repository.create(createRequest("a", "user-a", 1));
		await repository.create(createRequest("b", "user-b", 1));
		await repository.create(createRequest("c", "user-c", 2));

		await repository.approve("a", "admin", "2026-09-03T01:00:00.000Z", null);

		expect(await repository.findById("a")).toMatchObject({
			status: "approved",
			reviewerUserId: "admin",
		});
		expect(await repository.findById("b")).toMatchObject({
			status: "rejected",
			reviewNote: "同じ字幕の別の修正が承認されました。",
		});
		expect(await repository.findById("c")).toMatchObject({
			status: "pending",
		});
	});

	test("管理画面用に審査状態ごとの申請を返す", async () => {
		const repository = await createRepository();
		await repository.create(createRequest("a", "user-a", 1));
		await repository.create(createRequest("b", "user-b", 2));
		await repository.create(createRequest("c", "user-c", 3));

		await repository.approve("a", "admin", "2026-09-03T01:00:00.000Z", null);
		await repository.reject(
			"b",
			"admin",
			"2026-09-03T02:00:00.000Z",
			"聞き取りどおりのため",
		);

		expect(
			(await repository.listByStatus("pending")).map(({ id }) => id),
		).toEqual(["c"]);
		expect(
			(await repository.listByStatus("approved")).map(({ id }) => id),
		).toEqual(["a"]);
		expect(
			(await repository.listByStatus("rejected")).map(({ id }) => id),
		).toEqual(["b"]);
	});
});
