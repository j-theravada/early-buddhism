import { auth, clerkClient } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";
import { buildTalkDetailPageData } from "../application/talk/detail";
import { buildTranscriptCueHref } from "../application/talk/links";
import {
	TRANSCRIPT_CHANGE_REQUEST_STATUSES,
	type TranscriptChangeRequest,
} from "../application/transcript/change-request";
import { buildCueTimeHref } from "../application/transcript/presentation";
import SimplePageLayout from "../components/simple-page-layout";
import { getTalkById } from "../infrastructure/talk/repository";
import { getTranscriptChangeRequestRepository } from "../infrastructure/transcript/change-request-repository";
import SubtitleAdminChangeRequestList, {
	type SubtitleAdminChangeRequestItem,
} from "./change-request-list";

export const metadata: Metadata = {
	title: "字幕管理",
	robots: { follow: false, index: false },
};

const CLERK_USER_BATCH_SIZE = 100;

type SubtitleAdminUser = {
	displayName: string;
	emailAddress: string | null;
};

function formatSrtTime(seconds: number): string {
	const totalSeconds = Math.max(0, Math.floor(seconds));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const remainder = totalSeconds % 60;
	return [hours, minutes, remainder]
		.map((value) => value.toString().padStart(2, "0"))
		.join(":");
}

function fallbackUser(userId: string): SubtitleAdminUser {
	return { displayName: userId, emailAddress: null };
}

async function loadUsersById(
	userIds: (string | null)[],
): Promise<Map<string, SubtitleAdminUser>> {
	const uniqueUserIds = [
		...new Set(userIds.filter((userId): userId is string => userId !== null)),
	];
	const usersById = new Map(
		uniqueUserIds.map((userId) => [userId, fallbackUser(userId)]),
	);
	if (uniqueUserIds.length === 0) return usersById;

	try {
		const client = await clerkClient();
		const batches = Array.from(
			{ length: Math.ceil(uniqueUserIds.length / CLERK_USER_BATCH_SIZE) },
			(_, index) =>
				uniqueUserIds.slice(
					index * CLERK_USER_BATCH_SIZE,
					(index + 1) * CLERK_USER_BATCH_SIZE,
				),
		);
		const responses = await Promise.all(
			batches.map((userId) =>
				client.users.getUserList({ limit: userId.length, userId }),
			),
		);

		for (const user of responses.flatMap(({ data }) => data)) {
			const emailAddress = user.primaryEmailAddress?.emailAddress ?? null;
			usersById.set(user.id, {
				displayName:
					user.fullName?.trim() || user.username || emailAddress || user.id,
				emailAddress,
			});
		}
	} catch {
		return usersById;
	}

	return usersById;
}

async function buildRequestItem(
	request: TranscriptChangeRequest,
	usersById: Map<string, SubtitleAdminUser>,
): Promise<SubtitleAdminChangeRequestItem> {
	const talk = await getTalkById(request.talkId);
	const detail = talk ? buildTalkDetailPageData(talk) : null;
	const startSeconds = Math.max(0, Math.floor(request.cueStart));
	return {
		id: request.id,
		talkId: request.talkId,
		talkTitle: detail?.talk.title || request.talkId,
		talkHref: buildTranscriptCueHref(request.talkId, request.cueIndex),
		cueIndex: request.cueIndex,
		startLabel: formatSrtTime(startSeconds),
		embedUrl: detail?.talk.embedUrl ?? null,
		thumbnailUrl: detail?.talk.thumbnailUrl ?? null,
		playbackUrl: buildCueTimeHref(detail?.embedUrlPrefix, startSeconds),
		baseText: request.baseText,
		proposedText: request.proposedText,
		reason: request.reason,
		submitter:
			usersById.get(request.submitterUserId) ??
			fallbackUser(request.submitterUserId),
		status: request.status,
		createdAt: request.createdAt,
		reviewer: request.reviewerUserId
			? (usersById.get(request.reviewerUserId) ??
				fallbackUser(request.reviewerUserId))
			: null,
		reviewedAt: request.reviewedAt,
		reviewNote: request.reviewNote,
	};
}

export default async function SubtitleAdminPage() {
	const { userId } = await auth();
	const repository = getTranscriptChangeRequestRepository();
	const requestsByStatus = await Promise.all(
		TRANSCRIPT_CHANGE_REQUEST_STATUSES.map((status) =>
			repository.listByStatus(status),
		),
	);
	const allRequests = requestsByStatus.flat();
	const usersById = await loadUsersById([
		userId,
		...allRequests.flatMap(({ submitterUserId, reviewerUserId }) => [
			submitterUserId,
			reviewerUserId,
		]),
	]);
	const requests: SubtitleAdminChangeRequestItem[] = await Promise.all(
		allRequests.map((request) => buildRequestItem(request, usersById)),
	);

	return (
		<SimplePageLayout title="字幕管理">
			<div className="mb-6 text-right">
				<Link
					className="text-sm font-semibold text-[#8a6a38] underline transition hover:text-[#6f552d]"
					href="/account"
				>
					アカウントとセキュリティ設定
				</Link>
			</div>
			<SubtitleAdminChangeRequestList
				currentReviewer={
					userId
						? (usersById.get(userId) ?? fallbackUser(userId))
						: { displayName: "現在の管理者", emailAddress: null }
				}
				initialRequests={requests}
			/>
		</SimplePageLayout>
	);
}
