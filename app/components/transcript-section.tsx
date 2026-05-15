"use client";

import { useMemo, useState } from "react";
import {
	buildCueTimeHref,
	buildTranscriptParagraphs,
} from "../application/transcript/presentation";
import type { TranscriptCue } from "../domain/transcript/types";
import { FEEDBACK_FORM_URL } from "../utils/site-links";

type Props = {
	transcript: TranscriptCue[];
	embedUrlPrefix?: string | null;
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

export default function TranscriptSection({
	transcript,
	embedUrlPrefix,
}: Props) {
	const [mode, setMode] = useState<TranscriptMode>("timeline");
	const paragraphs = useMemo(
		() => buildTranscriptParagraphs(transcript),
		[transcript],
	);

	return (
		<div className="mt-6 border-t border-gray-100 pt-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h3 className="text-sm font-semibold text-amber-900 sm:text-base">
					文字起こし
				</h3>
				<div
					aria-label="文字起こしの表示切り替え"
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
			</div>

			<div className="mt-4 rounded-lg bg-amber-50/70 px-4 py-3 text-xs text-amber-900 sm:text-sm">
				これはAIの文字起こしを元にしたものです。間違いがある場合は
				<a
					className="ml-1 font-medium underline hover:text-amber-700"
					href={FEEDBACK_FORM_URL}
					rel="noopener noreferrer"
					target="_blank"
				>
					こちら
				</a>
				にご連絡ください。
			</div>

			{mode === "timeline" ? (
				<div className="mt-4 grid gap-y-2.5">
					{transcript.map((cue) => {
						const startSeconds = Math.max(0, Math.floor(cue.start));
						const timeHref = buildCueTimeHref(embedUrlPrefix, startSeconds);
						const timeRangeLabel = `${cue.startLabel} - ${cue.endLabel}`;

						return (
							<div
								className="grid gap-x-4 gap-y-0.5 sm:grid-cols-[110px_1fr]"
								key={`${cue.index}-${cue.start}`}
							>
								<div className="sm:pt-0.5">
									{timeHref ? (
										<a
											className="text-sm font-medium text-amber-700 underline transition hover:text-amber-900"
											href={timeHref}
											target="talk-player"
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
									{cue.text}
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
							{paragraph}
						</p>
					))}
				</div>
			)}
		</div>
	);
}
