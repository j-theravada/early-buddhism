import type { Talk } from "../../domain/talk/types";
import {
	replaceSrtCueText,
	SrtCueConflictError,
} from "../../domain/transcript/srt-editor";
import type { GoogleDriveTranscriptFileClient } from "../../infrastructure/google-drive/transcript-file";
import { extractGoogleDriveFileId } from "../../infrastructure/transcript/download";
import type { TranscriptChangeRequest } from "./change-request";

export type TranscriptChangeRequestReviewErrorCode =
	| "not_found"
	| "not_pending"
	| "source_conflict";

export class TranscriptChangeRequestReviewError extends Error {
	readonly code: TranscriptChangeRequestReviewErrorCode;

	constructor(code: TranscriptChangeRequestReviewErrorCode, message: string) {
		super(message);
		this.name = "TranscriptChangeRequestReviewError";
		this.code = code;
	}
}

export type TranscriptChangeRequestReviewDependencies = {
	findRequest: (requestId: string) => Promise<TranscriptChangeRequest | null>;
	loadTalk: (talkId: string) => Promise<Talk | null>;
	drive: GoogleDriveTranscriptFileClient;
	dispatchGeneratedDataRefresh: () => Promise<void>;
	approveRequest: (
		requestId: string,
		reviewerUserId: string,
		reviewedAt: string,
		reviewNote: string | null,
	) => Promise<TranscriptChangeRequest | null>;
	now: () => string;
};

function conflict(message: string): never {
	throw new TranscriptChangeRequestReviewError("source_conflict", message);
}

export async function approveTranscriptChangeRequest(
	requestId: string,
	reviewerUserId: string,
	reviewNote: string | null,
	dependencies: TranscriptChangeRequestReviewDependencies,
): Promise<TranscriptChangeRequest> {
	const request = await dependencies.findRequest(requestId);
	if (!request) {
		throw new TranscriptChangeRequestReviewError(
			"not_found",
			"修正申請が見つかりません。",
		);
	}
	if (request.status !== "pending") {
		throw new TranscriptChangeRequestReviewError(
			"not_pending",
			"この修正申請はすでに審査済みです。",
		);
	}

	const talk = await dependencies.loadTalk(request.talkId);
	const currentDriveFileId = talk?.srtLink
		? extractGoogleDriveFileId(talk.srtLink)
		: null;
	if (currentDriveFileId !== request.driveFileId) {
		conflict("SRTリンクが申請時から変更されています。");
	}

	const currentContent = await dependencies.drive.read(request.driveFileId);
	let edit;
	try {
		edit = replaceSrtCueText(currentContent, {
			index: request.cueIndex,
			start: request.cueStart,
			end: request.cueEnd,
			text: request.baseText,
			proposedText: request.proposedText,
		});
	} catch (error) {
		if (error instanceof SrtCueConflictError) conflict(error.message);
		throw error;
	}

	if (edit.changed) {
		await dependencies.drive.update(request.driveFileId, edit.content);
	}
	await dependencies.dispatchGeneratedDataRefresh();

	const approved = await dependencies.approveRequest(
		request.id,
		reviewerUserId,
		dependencies.now(),
		reviewNote,
	);
	if (!approved) {
		throw new TranscriptChangeRequestReviewError(
			"not_found",
			"修正申請が見つかりません。",
		);
	}
	if (approved.status !== "approved") {
		throw new TranscriptChangeRequestReviewError(
			"not_pending",
			"この修正申請は別の管理者により審査済みです。",
		);
	}
	return approved;
}
