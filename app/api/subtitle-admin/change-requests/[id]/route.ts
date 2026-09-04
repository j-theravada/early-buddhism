import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { parseTranscriptChangeRequestReviewInput } from "../../../../application/transcript/change-request";
import {
	approveTranscriptChangeRequest,
	TranscriptChangeRequestReviewError,
} from "../../../../application/transcript/review-change-request";
import { currentUserIsSubtitleAdmin } from "../../../../infrastructure/auth/server";
import {
	assertGeneratedDataWorkflowConfig,
	getGeneratedDataWorkflowDispatcher,
} from "../../../../infrastructure/github/generated-data-workflow";
import {
	assertGoogleDriveWorkloadIdentityConfig,
	getGoogleDriveTranscriptFileClient,
} from "../../../../infrastructure/google-drive/transcript-file";
import { getTalkById } from "../../../../infrastructure/talk/repository";
import { getTranscriptChangeRequestRepository } from "../../../../infrastructure/transcript/change-request-repository";

export const runtime = "nodejs";

type RouteContext = {
	params: Promise<{ id: string }>;
};

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

function reviewErrorResponse(error: TranscriptChangeRequestReviewError) {
	const status = error.code === "not_found" ? 404 : 409;
	return NextResponse.json(
		{ error: error.message },
		{ status, headers: PRIVATE_HEADERS },
	);
}

export async function PATCH(request: Request, { params }: RouteContext) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json(
			{ error: "Unauthorized" },
			{ status: 401, headers: PRIVATE_HEADERS },
		);
	}
	if (!(await currentUserIsSubtitleAdmin())) {
		return NextResponse.json(
			{ error: "Forbidden" },
			{ status: 403, headers: PRIVATE_HEADERS },
		);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ error: "Invalid JSON" },
			{ status: 400, headers: PRIVATE_HEADERS },
		);
	}
	const input = parseTranscriptChangeRequestReviewInput(body);
	if (!input) {
		return NextResponse.json(
			{ error: "審査内容を確認してください。" },
			{ status: 400, headers: PRIVATE_HEADERS },
		);
	}

	const { id } = await params;
	const repository = getTranscriptChangeRequestRepository();
	if (input.decision === "reject") {
		const rejected = await repository.reject(
			id,
			userId,
			new Date().toISOString(),
			input.reviewNote,
		);
		if (!rejected) {
			return NextResponse.json(
				{ error: "未審査の修正申請が見つかりません。" },
				{ status: 409, headers: PRIVATE_HEADERS },
			);
		}
		return NextResponse.json(
			{ request: rejected },
			{ headers: PRIVATE_HEADERS },
		);
	}

	try {
		assertGoogleDriveWorkloadIdentityConfig();
		assertGeneratedDataWorkflowConfig();
	} catch {
		return NextResponse.json(
			{ error: "字幕公開用のサーバー設定が不足しています。" },
			{ status: 503, headers: PRIVATE_HEADERS },
		);
	}

	try {
		const drive = await getGoogleDriveTranscriptFileClient();
		const approved = await approveTranscriptChangeRequest(
			id,
			userId,
			input.reviewNote,
			{
				findRequest: repository.findById,
				loadTalk: getTalkById,
				drive,
				dispatchGeneratedDataRefresh: getGeneratedDataWorkflowDispatcher(),
				approveRequest: repository.approve,
				now: () => new Date().toISOString(),
			},
		);
		return NextResponse.json(
			{ request: approved },
			{ headers: PRIVATE_HEADERS },
		);
	} catch (error) {
		if (error instanceof TranscriptChangeRequestReviewError) {
			return reviewErrorResponse(error);
		}
		return NextResponse.json(
			{
				error:
					"Drive更新または公開処理に失敗しました。申請は未審査のままです。",
			},
			{ status: 502, headers: PRIVATE_HEADERS },
		);
	}
}
