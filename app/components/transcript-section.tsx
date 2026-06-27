"use client";

import { type MouseEvent, useEffect, useMemo, useState } from "react";
import {
	LOAD_TALK_PLAYER_EVENT,
	type LoadTalkPlayerEventDetail,
} from "../application/talk/player-events";
import { tokenizeSearchQuery } from "../application/talk/search";
import {
	buildCueTimeHref,
	buildTranscriptParagraphs,
} from "../application/transcript/presentation";
import type { TranscriptCue } from "../domain/transcript/types";
import { FEEDBACK_FORM_URL } from "../utils/site-links";
import { highlightMatches } from "./talk-gallery/highlight";

type Props = {
	transcript: TranscriptCue[];
	embedUrlPrefix?: string | null;
	hasStickyPlayer?: boolean;
	transcriptHighlightQuery?: string | null;
	targetCueIndex?: number | null;
};

type TranscriptMode = "timeline" | "plain";

const MODE_OPTIONS: Array<{ mode: TranscriptMode; label: string }> = [
	{ mode: "timeline", label: "タイムライン付き" },
	{ mode: "plain", label: "読みやすく" },
];

function getModeButtonClass(isActive: boolean): string {
	return `w-full min-w-0 whitespace-nowrap text-center rounded-full px-3 py-1 transition sm:min-w-[8.5rem] sm:px-3.5 sm:py-1.5 ${
		isActive
			? "bg-amber-100 text-amber-900"
			: "text-amber-700 hover:text-amber-900"
	}`;
}

function loadTalkPlayer(event: MouseEvent<HTMLAnchorElement>, src: string) {
	event.preventDefault();
	window.dispatchEvent(
		new CustomEvent<LoadTalkPlayerEventDetail>(LOAD_TALK_PLAYER_EVENT, {
			detail: { src },
		}),
	);
}

export default function TranscriptSection({
	transcript,
	embedUrlPrefix,
	hasStickyPlayer = false,
	transcriptHighlightQuery,
	targetCueIndex,
}: Props) {
	const [mode, setMode] = useState<TranscriptMode>("timeline");
	const paragraphs = useMemo(
		() => buildTranscriptParagraphs(transcript),
		[transcript],
	);
	const highlightTokens = useMemo(
		() => tokenizeSearchQuery(transcriptHighlightQuery ?? ""),
		[transcriptHighlightQuery],
	);

	useEffect(() => {
		if (
			mode !== "timeline" ||
			targetCueIndex === null ||
			targetCueIndex === undefined
		) {
			return;
		}

		const target = document.getElementById(`transcript-cue-${targetCueIndex}`);
		target?.scrollIntoView({ block: "center" });
	}, [mode, targetCueIndex]);

	return (
		<div className="mt-6 border-t border-gray-100 pt-6">
			<div
				className={`sticky ${
					hasStickyPlayer ? "transcript-toolbar-sticky" : "top-0"
				} z-10 -mx-6 border-y border-amber-100 bg-white/95 px-6 py-2.5 backdrop-blur`}
			>
				<div className="flex flex-wrap items-center gap-2.5 lg:flex-nowrap">
					<div
						aria-label="表示モードの切り替え"
						className="grid w-full grid-cols-2 rounded-full border border-amber-200 bg-white text-xs font-medium text-amber-900 sm:w-auto sm:text-sm"
						role="tablist"
					>
						{MODE_OPTIONS.map((option) => (
							<button
								aria-selected={mode === option.mode}
								className={getModeButtonClass(mode === option.mode)}
								key={option.mode}
								onClick={() => setMode(option.mode)}
								role="tab"
								type="button"
							>
								{option.label}
							</button>
						))}
					</div>
					<p className="min-w-0 text-xs text-amber-800 sm:ml-auto lg:whitespace-nowrap">
						AI文字起こしです。誤りは
						<a
							className="mx-0.5 font-medium underline hover:text-amber-700"
							href={FEEDBACK_FORM_URL}
							rel="noopener noreferrer"
							target="_blank"
						>
							こちら
						</a>
						へ。
					</p>
				</div>
			</div>

			{mode === "timeline" ? (
				<div className="mt-4 grid gap-y-2.5">
					{transcript.map((cue) => {
						const startSeconds = Math.max(0, Math.floor(cue.start));
						const timeHref = buildCueTimeHref(embedUrlPrefix, startSeconds);
						const timeRangeLabel = `${cue.startLabel} - ${cue.endLabel}`;
						const isTargetCue = targetCueIndex === cue.index;

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
								<p className="whitespace-pre-line text-sm leading-7 text-gray-700">
									{highlightMatches(cue.text, highlightTokens)}
								</p>
							</div>
						);
					})}
				</div>
			) : (
				<div className="mt-4 space-y-3">
					{paragraphs.map((paragraph, index) => (
						<p
							className="text-sm leading-7 text-gray-700"
							key={`${index}-${paragraph.slice(0, 12)}`}
						>
							{highlightMatches(paragraph, highlightTokens)}
						</p>
					))}
				</div>
			)}
		</div>
	);
}
