"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useEffect, useState } from "react";
import type { TranscriptCue } from "../domain/transcript/types";
import { useIsSignedIn } from "../infrastructure/auth/client";

const TranscriptSection = dynamic(() => import("./transcript-section"), {
	loading: () => null,
});

export type TranscriptMode = "plain" | "timeline";
export type TranscriptLoadStatus =
	| "idle"
	| "loading"
	| "ready"
	| "missing"
	| "error";

type TranscriptLoaderState = {
	mode: TranscriptMode;
	status: TranscriptLoadStatus;
	deepLinkKey: string;
};

type Props = {
	children: ReactNode;
	talkId: string;
	embedUrlPrefix?: string | null;
	hasStickyPlayer?: boolean;
	transcriptHighlightQuery?: string | null;
	targetCueIndex?: number | null;
};

type TimelineProps = Pick<
	Props,
	"talkId" | "embedUrlPrefix" | "transcriptHighlightQuery" | "targetCueIndex"
>;

const MODE_OPTIONS: Array<{ mode: TranscriptMode; label: string }> = [
	{ mode: "plain", label: "読みやすく" },
	{ mode: "timeline", label: "タイムライン付き" },
];

function getModeButtonClass(isActive: boolean): string {
	return `w-full min-w-0 whitespace-nowrap text-center rounded-full px-3 py-1 transition sm:min-w-[8.5rem] sm:px-3.5 sm:py-1.5 ${
		isActive
			? "bg-amber-100 text-amber-900"
			: "text-amber-700 hover:text-amber-900"
	}`;
}

function buildTranscriptApiUrl(talkId: string): string {
	return `/api/transcripts/${encodeURIComponent(talkId)}`;
}

// The API response is untyped until this boundary predicate validates its object member.
/* oxlint-disable anti-slop/no-unknown-parameters */
function isTranscriptResponse(
	value: unknown,
): value is { transcript: unknown } {
	return typeof value === "object" && value !== null && "transcript" in value;
}
/* oxlint-enable anti-slop/no-unknown-parameters */

// Transcript JSON scalar values are checked before constructing a TranscriptCue.
// oxlint-disable-next-line anti-slop/no-unknown-parameters
function isTranscriptCue(value: unknown): value is TranscriptCue {
	if (typeof value !== "object" || value === null) return false;

	return (
		"index" in value &&
		typeof value.index === "number" &&
		Number.isFinite(value.index) &&
		"start" in value &&
		typeof value.start === "number" &&
		Number.isFinite(value.start) &&
		"end" in value &&
		typeof value.end === "number" &&
		Number.isFinite(value.end) &&
		"startLabel" in value &&
		typeof value.startLabel === "string" &&
		"endLabel" in value &&
		typeof value.endLabel === "string" &&
		"text" in value &&
		typeof value.text === "string"
	);
}

// Response.json() returns an untyped payload; this function is its decoder boundary.
// oxlint-disable-next-line anti-slop/no-unknown-parameters
function parseTranscriptResponse(value: unknown): TranscriptCue[] {
	if (!isTranscriptResponse(value)) {
		throw new Error("Transcript response must include transcript.");
	}
	if (
		!Array.isArray(value.transcript) ||
		!value.transcript.every(isTranscriptCue)
	) {
		throw new Error("Transcript must be an array.");
	}
	return value.transcript;
}

export function getInitialTranscriptMode(
	targetCueIndex: number | null | undefined,
	transcriptHighlightQuery: string | null | undefined,
): TranscriptMode {
	return targetCueIndex !== null && targetCueIndex !== undefined
		? "timeline"
		: transcriptHighlightQuery?.trim()
			? "timeline"
			: "plain";
}

function getTranscriptDeepLinkKey(
	targetCueIndex: number | null | undefined,
	transcriptHighlightQuery: string | null | undefined,
): string {
	if (targetCueIndex !== null && targetCueIndex !== undefined) {
		return `cue:${targetCueIndex}`;
	}
	const query = transcriptHighlightQuery?.trim();
	return query ? `query:${query}` : "";
}

export function TranscriptContent({
	children,
	mode,
	status,
	transcript,
	...timelineProps
}: {
	children: ReactNode;
	mode: TranscriptMode;
	status: TranscriptLoadStatus;
	transcript: TranscriptCue[] | null;
} & TimelineProps) {
	if (mode === "timeline" && status === "ready" && transcript) {
		return <TranscriptSection transcript={transcript} {...timelineProps} />;
	}

	return (
		<>
			{mode === "timeline" && status === "loading" && (
				<p className="mt-4 text-sm text-gray-600">
					タイムラインを読み込んでいます。
				</p>
			)}
			{mode === "timeline" && (status === "error" || status === "missing") && (
				<p className="mt-4 text-sm text-red-700">
					タイムラインを読み込めませんでした。読みやすい全文を表示しています。
				</p>
			)}
			{children}
		</>
	);
}

export default function TranscriptSectionLoader({
	children,
	talkId,
	embedUrlPrefix,
	hasStickyPlayer = false,
	transcriptHighlightQuery,
	targetCueIndex,
}: Props) {
	const isSignedIn = useIsSignedIn();
	const [transcript, setTranscript] = useState<TranscriptCue[] | null>(null);
	const [storedLoaderState, setLoaderState] = useState<TranscriptLoaderState>(
		() => {
			const mode = getInitialTranscriptMode(
				targetCueIndex,
				transcriptHighlightQuery,
			);
			return {
				mode,
				status: mode === "timeline" ? "loading" : "idle",
				deepLinkKey: getTranscriptDeepLinkKey(
					targetCueIndex,
					transcriptHighlightQuery,
				),
			};
		},
	);
	const deepLinkKey = getTranscriptDeepLinkKey(
		targetCueIndex,
		transcriptHighlightQuery,
	);
	let loaderState = storedLoaderState;
	if (deepLinkKey !== storedLoaderState.deepLinkKey) {
		const synchronizedState: TranscriptLoaderState = {
			...storedLoaderState,
			deepLinkKey,
		};
		if (deepLinkKey) {
			synchronizedState.mode = "timeline";
			synchronizedState.status =
				transcript === null ? "loading" : storedLoaderState.status;
		}
		loaderState = synchronizedState;
		setLoaderState(loaderState);
	}
	const { mode, status } = loaderState;

	useEffect(() => {
		if (mode !== "timeline" || status !== "loading" || transcript !== null)
			return;

		const controller = new AbortController();

		async function loadTranscript() {
			try {
				const response = await fetch(buildTranscriptApiUrl(talkId), {
					signal: controller.signal,
				});
				if (response.status === 404) {
					setLoaderState((current) => ({
						...current,
						status: "missing",
					}));
					return;
				}
				if (!response.ok) {
					throw new Error(`Transcript request failed: ${response.status}`);
				}
				setTranscript(parseTranscriptResponse(await response.json()));
				setLoaderState((current) => ({ ...current, status: "ready" }));
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError")
					return;
				setLoaderState((current) => ({ ...current, status: "error" }));
			}
		}

		void loadTranscript();
		return () => controller.abort();
	}, [mode, status, talkId, transcript]);

	function selectMode(nextMode: TranscriptMode) {
		setLoaderState((current) => {
			return {
				...current,
				mode: nextMode,
				status:
					nextMode === "timeline" && transcript === null
						? "loading"
						: current.status,
			};
		});
	}

	return (
		<section className="mt-6 border-t border-gray-100 pt-6">
			<div
				className={`sticky ${
					hasStickyPlayer ? "transcript-toolbar-sticky" : "top-0"
				} z-10 -mx-6 border-y border-amber-100 bg-white/95 px-6 py-2.5 backdrop-blur`}
			>
				<div className="flex flex-wrap items-center gap-2.5 lg:flex-nowrap">
					<h2 className="sr-only">文字起こし表示</h2>
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
								onClick={() => selectMode(option.mode)}
								role="tab"
								type="button"
							>
								{option.label}
							</button>
						))}
					</div>
					<p className="min-w-0 text-xs text-amber-800 sm:ml-auto lg:whitespace-nowrap">
						{isSignedIn ? (
							"AI文字起こしです。タイムラインの字幕をクリックすると修正申請できます。"
						) : (
							<>
								AI文字起こしです。
								<a
									className="font-medium underline hover:text-amber-700"
									href={`/login?redirect_url=${encodeURIComponent(`/talks/${talkId}`)}`}
								>
									ログイン
								</a>
								すると修正申請を出すことができます。
							</>
						)}
					</p>
				</div>
			</div>
			<TranscriptContent
				embedUrlPrefix={embedUrlPrefix}
				mode={mode}
				status={status}
				talkId={talkId}
				targetCueIndex={targetCueIndex}
				transcript={transcript}
				transcriptHighlightQuery={transcriptHighlightQuery}
			>
				{children}
			</TranscriptContent>
		</section>
	);
}
