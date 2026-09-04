import type {
	CreateTranscriptChangeRequestInput,
	TranscriptChangeRequestStatus,
} from "../../application/transcript/change-request";

export type UserTranscriptChangeRequest = {
	id: string;
	cueIndex: number;
	proposedText: string;
	status: TranscriptChangeRequestStatus;
	createdAt: string;
	reviewNote: string | null;
};

type ListResponse = {
	requests: UserTranscriptChangeRequest[];
};

type ResponseInput = {
	error?: unknown;
	requests?: unknown;
	id?: unknown;
	cueIndex?: unknown;
	proposedText?: unknown;
	status?: unknown;
	createdAt?: unknown;
	reviewNote?: unknown;
};

// API JSON has no trusted shape until these boundary decoders accept it.
/* oxlint-disable anti-slop/no-runtime-typeof, anti-slop/no-unknown-parameters */
function buildErrorMessage(status: number, data: ResponseInput): string {
	return typeof data.error === "string"
		? data.error
		: `修正申請の通信に失敗しました（${status}）。`;
}

function isResponseInput(value: unknown): value is ResponseInput {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUserTranscriptChangeRequest(
	value: unknown,
): value is UserTranscriptChangeRequest {
	if (!isResponseInput(value)) return false;
	return (
		typeof value.id === "string" &&
		typeof value.cueIndex === "number" &&
		typeof value.proposedText === "string" &&
		(value.status === "pending" ||
			value.status === "approved" ||
			value.status === "rejected") &&
		typeof value.createdAt === "string" &&
		(value.reviewNote === null || typeof value.reviewNote === "string")
	);
}

async function readJsonObject(response: Response): Promise<ResponseInput> {
	try {
		const value: unknown = await response.json();
		return isResponseInput(value) ? value : {};
	} catch {
		return {};
	}
}

function parseListResponse(value: ResponseInput): ListResponse | null {
	return Array.isArray(value.requests) &&
		value.requests.every(isUserTranscriptChangeRequest)
		? { requests: value.requests }
		: null;
}
/* oxlint-enable anti-slop/no-runtime-typeof, anti-slop/no-unknown-parameters */

export async function listTranscriptChangeRequests(
	talkId: string,
	signal?: AbortSignal,
): Promise<UserTranscriptChangeRequest[]> {
	const response = await fetch(
		`/api/transcript-change-requests?talkId=${encodeURIComponent(talkId)}`,
		{ cache: "no-store", signal },
	);
	const data = await readJsonObject(response);
	if (!response.ok) {
		throw new Error(buildErrorMessage(response.status, data));
	}
	const parsed = parseListResponse(data);
	if (!parsed) throw new Error("修正申請の応答形式が不正です。");
	return parsed.requests;
}

export async function submitTranscriptChangeRequest(
	input: CreateTranscriptChangeRequestInput,
): Promise<UserTranscriptChangeRequest> {
	const response = await fetch("/api/transcript-change-requests", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
	});
	const data = await readJsonObject(response);
	if (!response.ok) {
		throw new Error(buildErrorMessage(response.status, data));
	}
	if (!isUserTranscriptChangeRequest(data)) {
		throw new Error("修正申請の応答形式が不正です。");
	}
	return data;
}
