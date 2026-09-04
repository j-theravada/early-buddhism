import { and, asc, desc, eq, ne } from "drizzle-orm";
import type { TranscriptChangeRequest } from "../../application/transcript/change-request";
import { getDatabase, type Database } from "../database/drizzle";
import { transcriptChangeRequests } from "../database/schema";

const USER_REQUEST_LIMIT = 100;
const ADMIN_PENDING_LIMIT = 200;
const SUPERSEDED_REVIEW_NOTE = "同じ字幕の別の修正が承認されました。";

export function createTranscriptChangeRequestRepository(database: Database) {
	const listForUserTalk = async (
		userId: string,
		talkId: string,
	): Promise<TranscriptChangeRequest[]> => {
		return database
			.select()
			.from(transcriptChangeRequests)
			.where(
				and(
					eq(transcriptChangeRequests.submitterUserId, userId),
					eq(transcriptChangeRequests.talkId, talkId),
				),
			)
			.orderBy(desc(transcriptChangeRequests.createdAt))
			.limit(USER_REQUEST_LIMIT);
	};

	const listPending = async (): Promise<TranscriptChangeRequest[]> => {
		return database
			.select()
			.from(transcriptChangeRequests)
			.where(eq(transcriptChangeRequests.status, "pending"))
			.orderBy(asc(transcriptChangeRequests.createdAt))
			.limit(ADMIN_PENDING_LIMIT);
	};

	const findById = async (
		requestId: string,
	): Promise<TranscriptChangeRequest | null> => {
		const rows = await database
			.select()
			.from(transcriptChangeRequests)
			.where(eq(transcriptChangeRequests.id, requestId))
			.limit(1);
		return rows[0] ?? null;
	};

	const findPendingForUserCue = async (
		userId: string,
		talkId: string,
		cueIndex: number,
	): Promise<TranscriptChangeRequest | null> => {
		const rows = await database
			.select()
			.from(transcriptChangeRequests)
			.where(
				and(
					eq(transcriptChangeRequests.submitterUserId, userId),
					eq(transcriptChangeRequests.talkId, talkId),
					eq(transcriptChangeRequests.cueIndex, cueIndex),
					eq(transcriptChangeRequests.status, "pending"),
				),
			)
			.limit(1);
		return rows[0] ?? null;
	};

	const create = async (
		request: TranscriptChangeRequest,
	): Promise<TranscriptChangeRequest> => {
		const rows = await database
			.insert(transcriptChangeRequests)
			.values(request)
			.returning();
		return rows[0] ?? request;
	};

	const approve = async (
		requestId: string,
		reviewerUserId: string,
		reviewedAt: string,
		reviewNote: string | null,
	): Promise<TranscriptChangeRequest | null> => {
		return database.transaction(async (transaction) => {
			const approvedRows = await transaction
				.update(transcriptChangeRequests)
				.set({
					status: "approved",
					reviewerUserId,
					reviewedAt,
					reviewNote,
				})
				.where(
					and(
						eq(transcriptChangeRequests.id, requestId),
						eq(transcriptChangeRequests.status, "pending"),
					),
				)
				.returning();
			const approved = approvedRows[0];
			if (!approved) {
				const currentRows = await transaction
					.select()
					.from(transcriptChangeRequests)
					.where(eq(transcriptChangeRequests.id, requestId))
					.limit(1);
				return currentRows[0] ?? null;
			}

			await transaction
				.update(transcriptChangeRequests)
				.set({
					status: "rejected",
					reviewerUserId,
					reviewedAt,
					reviewNote: SUPERSEDED_REVIEW_NOTE,
				})
				.where(
					and(
						eq(transcriptChangeRequests.talkId, approved.talkId),
						eq(transcriptChangeRequests.cueIndex, approved.cueIndex),
						eq(transcriptChangeRequests.status, "pending"),
						ne(transcriptChangeRequests.id, approved.id),
					),
				);

			return approved;
		});
	};

	const reject = async (
		requestId: string,
		reviewerUserId: string,
		reviewedAt: string,
		reviewNote: string | null,
	): Promise<TranscriptChangeRequest | null> => {
		const rows = await database
			.update(transcriptChangeRequests)
			.set({
				status: "rejected",
				reviewerUserId,
				reviewedAt,
				reviewNote,
			})
			.where(
				and(
					eq(transcriptChangeRequests.id, requestId),
					eq(transcriptChangeRequests.status, "pending"),
				),
			)
			.returning();
		return rows[0] ?? null;
	};

	return {
		approve,
		create,
		findById,
		findPendingForUserCue,
		listForUserTalk,
		listPending,
		reject,
	};
}

let repository: ReturnType<
	typeof createTranscriptChangeRequestRepository
> | null = null;

export function getTranscriptChangeRequestRepository() {
	repository ??= createTranscriptChangeRequestRepository(getDatabase());
	return repository;
}
