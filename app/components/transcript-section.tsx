"use client";

import { type MouseEvent, useEffect, useMemo } from "react";
import {
	LOAD_TALK_PLAYER_EVENT,
	type LoadTalkPlayerEventDetail,
} from "../application/talk/player-events";
import { tokenizeSearchQuery } from "../application/talk/search";
import { buildCueTimeHref } from "../application/transcript/presentation";
import type { TranscriptCue } from "../domain/transcript/types";
import { highlightMatches } from "./talk-gallery/highlight";

type Props = {
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
	transcript,
	embedUrlPrefix,
	transcriptHighlightQuery,
	targetCueIndex,
}: Props) {
	const highlightTokens = useMemo(
		() => tokenizeSearchQuery(transcriptHighlightQuery ?? ""),
		[transcriptHighlightQuery],
	);

	useEffect(() => {
		if (targetCueIndex === null || targetCueIndex === undefined) return;
		const target = document.getElementById(`transcript-cue-${targetCueIndex}`);
		target?.scrollIntoView({ block: "center" });
	}, [targetCueIndex]);

	return (
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
	);
}
