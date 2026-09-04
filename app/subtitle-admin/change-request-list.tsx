"use client";

import { useState } from "react";

export type SubtitleAdminChangeRequestItem = {
	id: string;
	talkTitle: string;
	talkHref: string;
	cueIndex: number;
	startLabel: string;
	baseText: string;
	proposedText: string;
	reason: string | null;
	submitterUserId: string;
	createdAt: string;
};

type ReviewDecision = "approve" | "reject";

function formatCreatedAt(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.valueOf())) return value;
	return new Intl.DateTimeFormat("ja-JP", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "Asia/Tokyo",
	}).format(date);
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
	initialRequests,
}: {
	initialRequests: SubtitleAdminChangeRequestItem[];
}) {
	const [requests, setRequests] = useState(initialRequests);
	const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
	const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);

	async function submitReview(
		request: SubtitleAdminChangeRequestItem,
		decision: ReviewDecision,
	) {
		setActiveRequestId(request.id);
		setError(null);
		setNotice(null);
		try {
			await reviewRequest(
				request.id,
				decision,
				reviewNotes[request.id]?.trim() ?? "",
			);
			setRequests((current) =>
				current.filter((candidate) => candidate.id !== request.id),
			);
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
			{requests.length === 0 ? (
				<p className="rounded-sm border border-[#d6c6ad] bg-[#fffcf7] p-6 text-sm text-[#666]">
					審査待ちの字幕修正はありません。
				</p>
			) : (
				requests.map((request) => {
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
								<p className="text-xs text-stone-500">
									{request.startLabel}・{formatCreatedAt(request.createdAt)}
								</p>
							</div>
							<dl className="mt-4 grid gap-3 text-sm">
								<div>
									<dt className="text-xs font-semibold text-stone-500">現在</dt>
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
							</dl>
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
							<p className="mt-2 text-[11px] text-stone-400">
								申請者: {request.submitterUserId}
							</p>
							<div className="mt-4 flex flex-wrap gap-2">
								<button
									className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
									disabled={activeRequestId !== null}
									onClick={() => submitReview(request, "approve")}
									type="button"
								>
									{isActive ? "処理中…" : "承認してSRTを更新"}
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
						</article>
					);
				})
			)}
		</div>
	);
}
