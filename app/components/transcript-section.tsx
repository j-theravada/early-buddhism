"use client";

import {
	type FormEvent,
	type MouseEvent,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	LOAD_TALK_PLAYER_EVENT,
	type LoadTalkPlayerEventDetail,
} from "../application/talk/player-events";
import { tokenizeSearchQuery } from "../application/talk/search";
import { buildCueTimeHref } from "../application/transcript/presentation";
import type { TranscriptCue } from "../domain/transcript/types";
import { useIsSignedIn } from "../infrastructure/auth/client";
import {
	listTranscriptChangeRequests,
	submitTranscriptChangeRequest,
	type UserTranscriptChangeRequest,
} from "../infrastructure/transcript/change-request-client";
import { highlightMatches } from "./talk-gallery/highlight";

type Props = {
	talkId: string;
	transcript: TranscriptCue[];
	embedUrlPrefix?: string | null;
	transcriptHighlightQuery?: string | null;
	targetCueIndex?: number | null;
};

function loadTalkPlayer(event: MouseEvent<HTMLAnchorElement>, src: string) {
	event.preventDefault();
	window.dispatchEvent(
		new CustomEvent<LoadTalkPlayerEventDetail>(LOAD_TALK_PLAYER_EVENT, {
			detail: { src },
		}),
	);
}

export default function TranscriptSection({
	talkId,
	transcript,
	embedUrlPrefix,
	transcriptHighlightQuery,
	targetCueIndex,
}: Props) {
	const isSignedIn = useIsSignedIn();
	const [requests, setRequests] = useState<UserTranscriptChangeRequest[]>([]);
	const [requestLoadError, setRequestLoadError] = useState(false);
	const [editingCueIndex, setEditingCueIndex] = useState<number | null>(null);
	const [proposedText, setProposedText] = useState("");
	const [reason, setReason] = useState("");
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const highlightTokens = useMemo(
		() => tokenizeSearchQuery(transcriptHighlightQuery ?? ""),
		[transcriptHighlightQuery],
	);
	const latestRequestByCue = useMemo(() => {
		const latest = new Map<number, UserTranscriptChangeRequest>();
		for (const request of requests) {
			if (!latest.has(request.cueIndex)) latest.set(request.cueIndex, request);
		}
		return latest;
	}, [requests]);

	useEffect(() => {
		if (!isSignedIn) return;

		const controller = new AbortController();
		void listTranscriptChangeRequests(talkId, controller.signal)
			.then((loadedRequests) => {
				setRequests(loadedRequests);
				setRequestLoadError(false);
				return undefined;
			})
			.catch(() => {
				if (controller.signal.aborted) return;
				setRequestLoadError(true);
			});
		return () => controller.abort();
	}, [isSignedIn, talkId]);

	useEffect(() => {
		if (targetCueIndex === null || targetCueIndex === undefined) return;
		const target = document.getElementById(`transcript-cue-${targetCueIndex}`);
		target?.scrollIntoView({ block: "center" });
	}, [targetCueIndex]);

	function beginEditing(cue: TranscriptCue) {
		setEditingCueIndex(cue.index);
		setProposedText(cue.text);
		setReason("");
		setSubmitError(null);
	}

	function cancelEditing() {
		setEditingCueIndex(null);
		setSubmitError(null);
	}

	async function submitChange(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (editingCueIndex === null) return;

		setIsSubmitting(true);
		setSubmitError(null);
		try {
			const created = await submitTranscriptChangeRequest({
				talkId,
				cueIndex: editingCueIndex,
				proposedText,
				reason: reason || null,
			});
			setRequests((current) => [created, ...current]);
			setEditingCueIndex(null);
		} catch (error) {
			setSubmitError(
				error instanceof Error ? error.message : "修正申請に失敗しました。",
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="mt-4 grid gap-y-2.5">
			{isSignedIn && requestLoadError && (
				<p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
					修正申請の状態を読み込めませんでした。
				</p>
			)}
			{transcript.map((cue) => {
				const startSeconds = Math.max(0, Math.floor(cue.start));
				const timeHref = buildCueTimeHref(embedUrlPrefix, startSeconds);
				const timeRangeLabel = `${cue.startLabel} - ${cue.endLabel}`;
				const isTargetCue = targetCueIndex === cue.index;
				const latestRequest = latestRequestByCue.get(cue.index);
				const isAwaitingPublication =
					latestRequest?.status === "approved" &&
					latestRequest.proposedText !== cue.text;
				const isEditing = editingCueIndex === cue.index;
				const canEdit =
					isSignedIn &&
					latestRequest?.status !== "pending" &&
					!isAwaitingPublication;

				return (
					<div
						className={`scroll-mt-32 grid gap-x-4 gap-y-0.5 sm:grid-cols-[110px_1fr] ${
							isTargetCue
								? "-mx-3 rounded-md border-l-2 border-amber-400 bg-yellow-50 px-3 py-2"
								: ""
						}`}
						id={`transcript-cue-${cue.index}`}
						key={`${cue.index}-${cue.start}`}
					>
						<div className="sm:pt-0.5">
							{timeHref ? (
								<a
									className="text-sm font-medium text-amber-700 underline transition hover:text-amber-900"
									href={timeHref}
									onClick={(event) => loadTalkPlayer(event, timeHref)}
								>
									{cue.startLabel}
								</a>
							) : (
								<span className="text-sm font-medium text-amber-700">
									{cue.startLabel}
								</span>
							)}
							<p className="text-[11px] text-stone-400">{timeRangeLabel}</p>
						</div>
						<div>
							{canEdit ? (
								<button
									aria-label={`${cue.startLabel}の字幕を修正`}
									className="w-full rounded-md text-left text-sm leading-7 text-gray-700 transition hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
									onClick={() => beginEditing(cue)}
									type="button"
								>
									<span className="whitespace-pre-line">
										{highlightMatches(cue.text, highlightTokens)}
									</span>
								</button>
							) : (
								<p className="whitespace-pre-line text-sm leading-7 text-gray-700">
									{highlightMatches(cue.text, highlightTokens)}
								</p>
							)}
							{latestRequest?.status === "pending" && (
								<p className="mt-1 text-xs font-medium text-amber-700">
									審査待ち
								</p>
							)}
							{isAwaitingPublication && (
								<p className="mt-1 text-xs font-medium text-emerald-700">
									承認済みです。公開反映には数分かかります。
								</p>
							)}
							{latestRequest?.status === "rejected" && (
								<p className="mt-1 text-xs text-stone-500">
									却下されました
									{latestRequest.reviewNote
										? `：${latestRequest.reviewNote}`
										: "。別の内容で再申請できます。"}
								</p>
							)}
							{isEditing && (
								<form
									className="mt-3 rounded-md border border-amber-200 bg-amber-50/60 p-3"
									onSubmit={submitChange}
								>
									<label className="block text-xs font-semibold text-stone-700">
										修正後の字幕
										<textarea
											className="mt-1 min-h-24 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-normal leading-6 text-gray-800"
											maxLength={1000}
											onChange={(event) => setProposedText(event.target.value)}
											required
											value={proposedText}
										/>
									</label>
									<label className="mt-3 block text-xs font-semibold text-stone-700">
										理由・補足（任意）
										<textarea
											className="mt-1 min-h-16 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-normal leading-6 text-gray-800"
											maxLength={1000}
											onChange={(event) => setReason(event.target.value)}
											value={reason}
										/>
									</label>
									{submitError && (
										<p className="mt-2 text-xs text-red-700">{submitError}</p>
									)}
									<div className="mt-3 flex gap-2">
										<button
											className="rounded-full bg-amber-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50"
											disabled={
												isSubmitting || proposedText.trim() === cue.text
											}
											type="submit"
										>
											{isSubmitting ? "送信中…" : "修正を申請"}
										</button>
										<button
											className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-600"
											disabled={isSubmitting}
											onClick={cancelEditing}
											type="button"
										>
											キャンセル
										</button>
									</div>
								</form>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}
