import { randomUUID } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
	parseCreateTranscriptChangeRequestInput,
	type TranscriptChangeRequest,
} from "../../application/transcript/change-request";
import { getTalkById } from "../../infrastructure/talk/repository";
import { getTranscriptChangeRequestRepository } from "../../infrastructure/transcript/change-request-repository";
import { extractGoogleDriveFileId } from "../../infrastructure/transcript/download";
import { getTranscriptByTalkId } from "../../infrastructure/transcript/repository";

export const runtime = "nodejs";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

function publicRequest(request: TranscriptChangeRequest) {
	return {
		id: request.id,
		cueIndex: request.cueIndex,
		proposedText: request.proposedText,
		status: request.status,
		createdAt: request.createdAt,
		reviewNote: request.reviewNote,
	};
}

export async function GET(request: Request) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json(
			{ error: "Unauthorized" },
			{ status: 401, headers: PRIVATE_HEADERS },
		);
	}

	const talkId = new URL(request.url).searchParams.get("talkId")?.trim() ?? "";
	if (!talkId) {
		return NextResponse.json(
			{ error: "talkId is required." },
			{ status: 400, headers: PRIVATE_HEADERS },
		);
	}
	const requests = await getTranscriptChangeRequestRepository().listForUserTalk(
		userId,
		talkId,
	);
	return NextResponse.json(
		{ requests: requests.map(publicRequest) },
		{ headers: PRIVATE_HEADERS },
	);
}

export async function POST(request: Request) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json(
			{ error: "Unauthorized" },
			{ status: 401, headers: PRIVATE_HEADERS },
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
	const input = parseCreateTranscriptChangeRequestInput(body);
	if (!input) {
		return NextResponse.json(
			{ error: "修正内容を確認してください。" },
			{ status: 400, headers: PRIVATE_HEADERS },
		);
	}

	const [talk, transcript] = await Promise.all([
		getTalkById(input.talkId),
		getTranscriptByTalkId(input.talkId),
	]);
	if (!talk || !transcript) {
		return NextResponse.json(
			{ error: "字幕が見つかりません。" },
			{ status: 404, headers: PRIVATE_HEADERS },
		);
	}
	const driveFileId = talk.srtLink
		? extractGoogleDriveFileId(talk.srtLink)
		: null;
	if (!driveFileId) {
		return NextResponse.json(
			{ error: "この字幕は修正申請に対応していません。" },
			{ status: 409, headers: PRIVATE_HEADERS },
		);
	}
	const matchingCues = transcript.filter((cue) => cue.index === input.cueIndex);
	if (matchingCues.length !== 1 || !matchingCues[0]) {
		return NextResponse.json(
			{ error: "対象の字幕が見つかりません。" },
			{ status: 404, headers: PRIVATE_HEADERS },
		);
	}
	const cue = matchingCues[0];
	if (cue.text === input.proposedText) {
		return NextResponse.json(
			{ error: "字幕が変更されていません。" },
			{ status: 400, headers: PRIVATE_HEADERS },
		);
	}

	const repository = getTranscriptChangeRequestRepository();
	const existing = await repository.findPendingForUserCue(
		userId,
		talk.id,
		input.cueIndex,
	);
	if (existing) {
		return NextResponse.json(
			{ error: "この字幕はすでに修正申請済みです。" },
			{ status: 409, headers: PRIVATE_HEADERS },
		);
	}

	const created = await repository.create({
		id: randomUUID(),
		talkId: talk.id,
		driveFileId,
		cueIndex: cue.index,
		cueStart: cue.start,
		cueEnd: cue.end,
		baseText: cue.text,
		proposedText: input.proposedText,
		reason: input.reason,
		submitterUserId: userId,
		status: "pending",
		createdAt: new Date().toISOString(),
		reviewerUserId: null,
		reviewedAt: null,
		reviewNote: null,
	});
	return NextResponse.json(publicRequest(created), {
		status: 201,
		headers: PRIVATE_HEADERS,
	});
}
