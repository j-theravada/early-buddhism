"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { TranscriptCue } from "../domain/transcript/types";

const TranscriptSection = dynamic(() => import("./transcript-section"), {
	loading: () => null,
});

type LoadState =
	| {
			status: "loading";
			transcript: null;
	  }
	| {
			status: "ready";
			transcript: TranscriptCue[];
	  }
	| {
			status: "missing" | "error";
			transcript: null;
	  };

type Props = {
	talkId: string;
	embedUrlPrefix?: string | null;
	hasStickyPlayer?: boolean;
	transcriptHighlightQuery?: string | null;
	targetCueIndex?: number | null;
};

function buildTranscriptApiUrl(talkId: string): string {
	return `/api/transcripts/${encodeURIComponent(talkId)}`;
}

function parseTranscriptResponse(value: unknown): TranscriptCue[] {
	if (typeof value !== "object" || value === null || !("transcript" in value)) {
		throw new Error("Transcript response must include transcript.");
	}

	const transcript = (value as { transcript: unknown }).transcript;
	if (!Array.isArray(transcript)) {
		throw new Error("Transcript must be an array.");
	}

	return transcript as TranscriptCue[];
}

function TranscriptLoadingMessage({ status }: { status: LoadState["status"] }) {
	if (status === "missing") {
		return null;
	}

	return (
		<div className="mt-6 border-t border-gray-100 pt-6 text-sm leading-relaxed text-gray-600">
			{status === "error"
				? "文字起こしを読み込めませんでした。時間をおいて再度お試しください。"
				: "文字起こしを読み込み中です。"}
		</div>
	);
}

function hasTargetCueIndex(value: number | null | undefined): value is number {
	return value !== null && value !== undefined;
}

export default function TranscriptSectionLoader({
	talkId,
	embedUrlPrefix,
	hasStickyPlayer = false,
	transcriptHighlightQuery,
	targetCueIndex,
}: Props) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [shouldLoad, setShouldLoad] = useState(
		() =>
			hasTargetCueIndex(targetCueIndex) ||
			Boolean(transcriptHighlightQuery?.trim()),
	);
	const [loadState, setLoadState] = useState<LoadState>({
		status: "loading",
		transcript: null,
	});

	useEffect(() => {
		if (shouldLoad) {
			return;
		}

		const target = containerRef.current;
		if (!target || !("IntersectionObserver" in window)) {
			setShouldLoad(true);
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					setShouldLoad(true);
				}
			},
			{ rootMargin: "600px 0px" },
		);
		observer.observe(target);

		return () => observer.disconnect();
	}, [shouldLoad]);

	useEffect(() => {
		if (!shouldLoad) {
			return;
		}

		const controller = new AbortController();

		async function loadTranscript() {
			try {
				const response = await fetch(buildTranscriptApiUrl(talkId), {
					signal: controller.signal,
				});
				if (response.status === 404) {
					setLoadState({
						status: "missing",
						transcript: null,
					});
					return;
				}
				if (!response.ok) {
					throw new Error(`Transcript request failed: ${response.status}`);
				}
				setLoadState({
					status: "ready",
					transcript: parseTranscriptResponse(await response.json()),
				});
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}
				setLoadState({
					status: "error",
					transcript: null,
				});
			}
		}

		void loadTranscript();

		return () => controller.abort();
	}, [shouldLoad, talkId]);

	if (loadState.status === "ready") {
		return (
			<div ref={containerRef}>
				<TranscriptSection
					embedUrlPrefix={embedUrlPrefix}
					hasStickyPlayer={hasStickyPlayer}
					targetCueIndex={targetCueIndex}
					transcript={loadState.transcript}
					transcriptHighlightQuery={transcriptHighlightQuery}
				/>
			</div>
		);
	}

	return (
		<div ref={containerRef}>
			<TranscriptLoadingMessage status={loadState.status} />
		</div>
	);
}
