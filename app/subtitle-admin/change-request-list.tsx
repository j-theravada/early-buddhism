"use client";

import { type MouseEvent, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TranscriptChangeRequestStatus } from "../application/transcript/change-request";
import TalkDetailPlayer from "../components/talk-detail-player";

type SubtitleAdminUser = {
	displayName: string;
	emailAddress: string | null;
};

export type SubtitleAdminChangeRequestItem = {
	id: string;
	talkId: string;
	talkTitle: string;
	talkHref: string;
	cueIndex: number;
	startLabel: string;
	embedUrl: string | null;
	thumbnailUrl: string | null;
	playbackUrl: string | null;
	baseText: string;
	proposedText: string;
	reason: string | null;
	submitter: SubtitleAdminUser;
	status: TranscriptChangeRequestStatus;
	createdAt: string;
	reviewer: SubtitleAdminUser | null;
	reviewedAt: string | null;
	reviewNote: string | null;
};

type ReviewDecision = "approve" | "reject";

type PlaybackSelection = {
	requestId: string;
	revision: number;
	initialPlaybackUrl: string | null;
};

const REVIEW_TABS = [
	{
		status: "pending",
		label: "審査待ち",
		emptyMessage: "審査待ちの字幕修正はありません。",
	},
	{
		status: "approved",
		label: "承認済み",
		emptyMessage: "承認済みの字幕修正はありません。",
	},
	{
		status: "rejected",
		label: "却下済み",
		emptyMessage: "却下済みの字幕修正はありません。",
	},
] as const satisfies readonly {
	status: TranscriptChangeRequestStatus;
	label: string;
	emptyMessage: string;
}[];

function getInitialPlaybackSelection(
	requests: SubtitleAdminChangeRequestItem[],
	status: TranscriptChangeRequestStatus,
): PlaybackSelection | null {
	const request = requests.find(
		(candidate) => candidate.status === status && candidate.embedUrl !== null,
	);
	return request
		? { requestId: request.id, revision: 0, initialPlaybackUrl: null }
		: null;
}

function formatDateTime(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.valueOf())) return value;
	return new Intl.DateTimeFormat("ja-JP", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "Asia/Tokyo",
	}).format(date);
}

function isRequestStatus(
	value: string,
): value is TranscriptChangeRequestStatus {
	return REVIEW_TABS.some(({ status }) => status === value);
}

function UserIdentity({
	label,
	user,
}: {
	label: string;
	user: SubtitleAdminUser;
}) {
	return (
		<span>
			{label}: {user.displayName}
			{user.emailAddress && user.emailAddress !== user.displayName ? (
				<span className="text-stone-400">（{user.emailAddress}）</span>
			) : null}
		</span>
	);
}

async function reviewRequest(
	requestId: string,
	decision: ReviewDecision,
	reviewNote: string,
): Promise<void> {
	const response = await fetch(
		`/api/subtitle-admin/change-requests/${encodeURIComponent(requestId)}`,
		{
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ decision, reviewNote: reviewNote || null }),
		},
	);
	if (response.ok) return;

	let message = `審査に失敗しました（${response.status}）。`;
	try {
		// SAFETY: Only the optional error string is consumed from this API boundary.
		const data = (await response.json()) as { error?: string };
		if (data.error) message = data.error;
	} catch {
		// Keep the status-based message when the response is not JSON.
	}
	throw new Error(message);
}

export default function SubtitleAdminChangeRequestList({
	currentReviewer,
	initialRequests,
}: {
	currentReviewer: SubtitleAdminUser;
	initialRequests: SubtitleAdminChangeRequestItem[];
}) {
	const [requests, setRequests] = useState(initialRequests);
	const [activeStatus, setActiveStatus] =
		useState<TranscriptChangeRequestStatus>("pending");
	const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
	const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [playback, setPlayback] = useState<PlaybackSelection | null>(() =>
		getInitialPlaybackSelection(initialRequests, "pending"),
	);
	const playbackRequest = playback
		? (requests.find((request) => request.id === playback.requestId) ?? null)
		: null;

	function selectStatus(value: string) {
		if (!isRequestStatus(value)) return;
		setActiveStatus(value);
		setPlayback(getInitialPlaybackSelection(requests, value));
	}

	function playFromRequest(
		event: MouseEvent<HTMLAnchorElement>,
		request: SubtitleAdminChangeRequestItem,
	) {
		if (!request.embedUrl || !request.playbackUrl) return;
		event.preventDefault();
		setPlayback((current) => ({
			requestId: request.id,
			revision: (current?.revision ?? 0) + 1,
			initialPlaybackUrl: request.playbackUrl,
		}));
	}

	async function submitReview(
		request: SubtitleAdminChangeRequestItem,
		decision: ReviewDecision,
	) {
		setActiveRequestId(request.id);
		setError(null);
		setNotice(null);
		const reviewNote = reviewNotes[request.id]?.trim() ?? "";
		try {
			await reviewRequest(request.id, decision, reviewNote);
			const nextStatus: TranscriptChangeRequestStatus =
				decision === "approve" ? "approved" : "rejected";
			const reviewedAt = new Date().toISOString();
			const nextRequests = requests.map((candidate) =>
				candidate.id === request.id
					? {
							...candidate,
							status: nextStatus,
							reviewedAt,
							reviewNote: reviewNote || null,
							reviewer: currentReviewer,
						}
					: decision === "approve" &&
						  candidate.status === "pending" &&
						  candidate.talkId === request.talkId &&
						  candidate.cueIndex === request.cueIndex
						? {
								...candidate,
								status: "rejected" as const,
								reviewedAt,
								reviewNote: "同じ字幕の別の修正が承認されました。",
								reviewer: currentReviewer,
							}
						: candidate,
			);
			setRequests(nextRequests);
			setPlayback(getInitialPlaybackSelection(nextRequests, activeStatus));
			setNotice(
				decision === "approve"
					? "承認しました。Driveは更新済みです。公開反映には数分かかります。"
					: "却下しました。",
			);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "審査に失敗しました。");
		} finally {
			setActiveRequestId(null);
		}
	}

	return (
		<div className="grid gap-5">
			{playback && playbackRequest?.embedUrl && (
				<div className="mb-3">
					<TalkDetailPlayer
						embedUrl={playbackRequest.embedUrl}
						initialPlaybackUrl={playback.initialPlaybackUrl}
						key={`${playback.requestId}-${playback.revision}`}
						talkId={playbackRequest.talkId}
						thumbnailUrl={playbackRequest.thumbnailUrl}
						title={playbackRequest.talkTitle}
					>
						{null}
					</TalkDetailPlayer>
				</div>
			)}
			{error && (
				<p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					{error}
				</p>
			)}
			{notice && (
				<p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
					{notice}
				</p>
			)}
			<Tabs onValueChange={selectStatus} value={activeStatus}>
				<TabsList aria-label="字幕修正の審査状態">
					{REVIEW_TABS.map(({ label, status }) => (
						<TabsTrigger key={status} value={status}>
							{label}
							<span className="rounded-full bg-stone-200 px-1.5 py-0.5 text-[11px] leading-none tabular-nums text-stone-600">
								{requests.filter((request) => request.status === status).length}
							</span>
						</TabsTrigger>
					))}
				</TabsList>
				{REVIEW_TABS.map(({ emptyMessage, status }) => {
					const statusRequests = requests.filter(
						(request) => request.status === status,
					);
					return (
						<TabsContent
							className="data-[state=inactive]:hidden"
							forceMount
							key={status}
							value={status}
						>
							{statusRequests.length === 0 ? (
								<p className="rounded-sm border border-[#d6c6ad] bg-[#fffcf7] p-6 text-sm text-[#666]">
									{emptyMessage}
								</p>
							) : (
								<div className="grid gap-5">
									{statusRequests.map((request) => {
										const isActive = activeRequestId === request.id;
										return (
											<article
												className="rounded-sm border border-[#d6c6ad] bg-[#fffcf7] p-5 sm:p-6"
												key={request.id}
											>
												<div className="flex flex-wrap items-baseline justify-between gap-2">
													<h2 className="font-semibold text-[#303030]">
														<a
															className="underline decoration-[#c8aa7a] underline-offset-4 hover:text-[#8a6a38]"
															href={request.talkHref}
															target="_blank"
														>
															{request.talkTitle}
														</a>
													</h2>
													<div className="text-xs text-stone-500">
														{request.playbackUrl ? (
															<a
																className="font-medium text-amber-700 underline transition hover:text-amber-900"
																href={request.playbackUrl}
																onClick={(event) =>
																	playFromRequest(event, request)
																}
															>
																{request.startLabel}
															</a>
														) : (
															<span>{request.startLabel}</span>
														)}
														<span>・{formatDateTime(request.createdAt)}</span>
													</div>
												</div>
												<dl className="mt-4 grid gap-3 text-sm">
													<div>
														<dt className="text-xs font-semibold text-stone-500">
															現在
														</dt>
														<dd className="mt-1 whitespace-pre-line rounded-md bg-stone-100 px-3 py-2 leading-6 text-stone-700">
															{request.baseText}
														</dd>
													</div>
													<div>
														<dt className="text-xs font-semibold text-emerald-700">
															修正案
														</dt>
														<dd className="mt-1 whitespace-pre-line rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 leading-6 text-stone-800">
															{request.proposedText}
														</dd>
													</div>
													{request.reason && (
														<div>
															<dt className="text-xs font-semibold text-stone-500">
																理由・補足
															</dt>
															<dd className="mt-1 whitespace-pre-line text-stone-700">
																{request.reason}
															</dd>
														</div>
													)}
													{status !== "pending" && request.reviewNote && (
														<div>
															<dt className="text-xs font-semibold text-stone-500">
																審査メモ
															</dt>
															<dd className="mt-1 whitespace-pre-line text-stone-700">
																{request.reviewNote}
															</dd>
														</div>
													)}
												</dl>
												<div className="mt-3 grid gap-1 text-[11px] text-stone-500">
													<UserIdentity
														label="申請者"
														user={request.submitter}
													/>
													{request.reviewer && request.reviewedAt ? (
														<span>
															<UserIdentity
																label="審査者"
																user={request.reviewer}
															/>
															・{formatDateTime(request.reviewedAt)}
														</span>
													) : null}
												</div>
												{status === "pending" ? (
													<>
														<label className="mt-4 block text-xs font-semibold text-stone-600">
															審査メモ（任意）
															<textarea
																className="mt-1 min-h-16 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-normal leading-6 text-gray-800"
																disabled={isActive}
																maxLength={1000}
																onChange={(event) =>
																	setReviewNotes((current) => ({
																		...current,
																		[request.id]: event.target.value,
																	}))
																}
																value={reviewNotes[request.id] ?? ""}
															/>
														</label>
														<div className="mt-4 flex flex-wrap gap-2">
															<button
																className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
																disabled={activeRequestId !== null}
																onClick={() => submitReview(request, "approve")}
																type="button"
															>
																{isActive ? "処理中…" : "承認して字幕を更新"}
															</button>
															<button
																className="rounded-full border border-red-300 bg-white px-5 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
																disabled={activeRequestId !== null}
																onClick={() => submitReview(request, "reject")}
																type="button"
															>
																却下
															</button>
														</div>
													</>
												) : null}
											</article>
										);
									})}
								</div>
							)}
						</TabsContent>
					);
				})}
			</Tabs>
		</div>
	);
}
