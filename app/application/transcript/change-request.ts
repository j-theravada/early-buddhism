export const TRANSCRIPT_CHANGE_REQUEST_STATUSES = [
	"pending",
	"approved",
	"rejected",
] as const;

export type TranscriptChangeRequestStatus =
	(typeof TRANSCRIPT_CHANGE_REQUEST_STATUSES)[number];

export type TranscriptChangeRequest = {
	id: string;
	talkId: string;
	driveFileId: string;
	cueIndex: number;
	cueStart: number;
	cueEnd: number;
	baseText: string;
	proposedText: string;
	reason: string | null;
	submitterUserId: string;
	status: TranscriptChangeRequestStatus;
	createdAt: string;
	reviewerUserId: string | null;
	reviewedAt: string | null;
	reviewNote: string | null;
};

export type CreateTranscriptChangeRequestInput = {
	talkId: string;
	cueIndex: number;
	proposedText: string;
	reason: string | null;
};

export const TRANSCRIPT_CHANGE_TEXT_MAX_LENGTH = 1_000;
export const TRANSCRIPT_CHANGE_REASON_MAX_LENGTH = 1_000;

type ChangeRequestInput = {
	talkId?: unknown;
	cueIndex?: unknown;
	proposedText?: unknown;
	reason?: unknown;
};

// Request JSON has no trusted shape until this predicate accepts its members.
/* oxlint-disable anti-slop/no-unknown-parameters */
function isChangeRequestInput(value: unknown): value is ChangeRequestInput {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/* oxlint-enable anti-slop/no-unknown-parameters */

function normalizeMultilineText(value: string): string {
	return value
		.replace(/\r\n?/g, "\n")
		.trim()
		.split("\n")
		.map((line) => line.trim())
		.join("\n");
}

function hasValidLength(value: string, maxLength: number): boolean {
	return value.length > 0 && value.length <= maxLength;
}

// Request JSON scalar values are validated and normalized at this API boundary.
/* oxlint-disable anti-slop/no-runtime-typeof, anti-slop/no-unknown-parameters */
export function parseCreateTranscriptChangeRequestInput(
	value: unknown,
): CreateTranscriptChangeRequestInput | null {
	if (!isChangeRequestInput(value)) return null;
	if (
		typeof value.talkId !== "string" ||
		typeof value.cueIndex !== "number" ||
		typeof value.proposedText !== "string" ||
		(value.reason !== undefined &&
			value.reason !== null &&
			typeof value.reason !== "string")
	) {
		return null;
	}

	const talkId = value.talkId.trim();
	const proposedText = normalizeMultilineText(value.proposedText);
	const reason =
		typeof value.reason === "string"
			? normalizeMultilineText(value.reason)
			: "";

	if (
		!hasValidLength(talkId, 200) ||
		!Number.isSafeInteger(value.cueIndex) ||
		value.cueIndex < 0 ||
		!hasValidLength(proposedText, TRANSCRIPT_CHANGE_TEXT_MAX_LENGTH) ||
		/\n[\t ]*\n/.test(proposedText) ||
		reason.length > TRANSCRIPT_CHANGE_REASON_MAX_LENGTH
	) {
		return null;
	}

	return {
		talkId,
		cueIndex: value.cueIndex,
		proposedText,
		reason: reason || null,
	};
}
/* oxlint-enable anti-slop/no-runtime-typeof, anti-slop/no-unknown-parameters */

type ReviewInput = {
	decision?: unknown;
	reviewNote?: unknown;
};

export type TranscriptChangeRequestReviewInput = {
	decision: "approve" | "reject";
	reviewNote: string | null;
};

// Review JSON has no trusted shape until this predicate accepts its members.
/* oxlint-disable anti-slop/no-unknown-parameters */
function isReviewInput(value: unknown): value is ReviewInput {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/* oxlint-enable anti-slop/no-unknown-parameters */

// Review JSON scalar values are validated and normalized at this API boundary.
/* oxlint-disable anti-slop/no-runtime-typeof, anti-slop/no-unknown-parameters */
export function parseTranscriptChangeRequestReviewInput(
	value: unknown,
): TranscriptChangeRequestReviewInput | null {
	if (!isReviewInput(value)) return null;
	if (value.decision !== "approve" && value.decision !== "reject") {
		return null;
	}
	if (
		value.reviewNote !== undefined &&
		value.reviewNote !== null &&
		typeof value.reviewNote !== "string"
	) {
		return null;
	}

	const reviewNote =
		typeof value.reviewNote === "string"
			? normalizeMultilineText(value.reviewNote)
			: "";
	if (reviewNote.length > TRANSCRIPT_CHANGE_REASON_MAX_LENGTH) return null;

	return {
		decision: value.decision,
		reviewNote: reviewNote || null,
	};
}
/* oxlint-enable anti-slop/no-runtime-typeof, anti-slop/no-unknown-parameters */
