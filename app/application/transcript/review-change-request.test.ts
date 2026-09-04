import { describe, expect, test } from "bun:test";
import type { Talk } from "../../domain/talk/types";
import type { TranscriptChangeRequest } from "./change-request";
import {
	approveTranscriptChangeRequest,
	type TranscriptChangeRequestReviewDependencies,
} from "./review-change-request";

const source = `1
00:00:00,000 --> 00:00:02,000
AIの誤変換
`;

const request: TranscriptChangeRequest = {
	id: "request-1",
	talkId: "TALK-1",
	driveFileId: "FILE-ID",
	cueIndex: 1,
	cueStart: 0,
	cueEnd: 2,
	baseText: "AIの誤変換",
	proposedText: "正しい字幕",
	reason: null,
	submitterUserId: "user-1",
	status: "pending",
	createdAt: "2026-09-03T00:00:00.000Z",
	reviewerUserId: null,
	reviewedAt: null,
	reviewNote: null,
};

const talk: Talk = {
	attachmentsLink: null,
	collectionId: "other",
	collectionLabel: "その他",
	description: "",
	duration: "00:02",
	dvdId: "DVD-1",
	event: "",
	folder: "",
	format: "video",
	id: "TALK-1",
	kind: "talk",
	language: "ja",
	recordedOn: "2026-09-03",
	recordedOnDate: new Date("2026-09-03T00:00:00.000Z"),
	seriesId: "",
	seriesLabel: "",
	slideLinks: [],
	speaker: "",
	srtLink: "https://drive.google.com/file/d/FILE-ID/view",
	title: "テスト法話",
	venue: "",
	youtubeLink: null,
};

function createDependencies(
	content = source,
): TranscriptChangeRequestReviewDependencies & { events: string[] } {
	const events: string[] = [];
	return {
		events,
		findRequest: async () => request,
		loadTalk: async () => talk,
		drive: {
			read: async () => {
				events.push("read");
				return content;
			},
			update: async (_fileId, updatedContent) => {
				events.push(`update:${updatedContent.includes("正しい字幕")}`);
			},
		},
		dispatchGeneratedDataRefresh: async () => {
			events.push("dispatch");
		},
		approveRequest: async () => {
			events.push("approve");
			return {
				...request,
				status: "approved",
				reviewerUserId: "admin-1",
				reviewedAt: "2026-09-03T01:00:00.000Z",
			};
		},
		now: () => "2026-09-03T01:00:00.000Z",
	};
}

describe("approveTranscriptChangeRequest", () => {
	test("Driveを更新して生成を起動した後に承認済みにする", async () => {
		const dependencies = createDependencies();
		const approved = await approveTranscriptChangeRequest(
			request.id,
			"admin-1",
			null,
			dependencies,
		);

		expect(approved.status).toBe("approved");
		expect(dependencies.events).toEqual([
			"read",
			"update:true",
			"dispatch",
			"approve",
		]);
	});

	test("Driveが更新済みなら再書き込みせず後続処理を完了する", async () => {
		const dependencies = createDependencies(
			source.replace("AIの誤変換", "正しい字幕"),
		);
		await approveTranscriptChangeRequest(
			request.id,
			"admin-1",
			null,
			dependencies,
		);
		expect(dependencies.events).toEqual(["read", "dispatch", "approve"]);
	});

	test("Drive本文が別内容ならpendingのまま競合を返す", async () => {
		const dependencies = createDependencies(
			source.replace("AIの誤変換", "第三の字幕"),
		);
		await expect(
			approveTranscriptChangeRequest(request.id, "admin-1", null, dependencies),
		).rejects.toMatchObject({
			code: "source_conflict",
		});
		expect(dependencies.events).toEqual(["read"]);
	});
});
