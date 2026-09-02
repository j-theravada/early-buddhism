"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getResumeSeconds } from "../application/watch-history";
import {
	LOAD_TALK_PLAYER_EVENT,
	type LoadTalkPlayerEventDetail,
} from "../application/talk/player-events";
import { useIsSignedIn } from "../infrastructure/auth/client";
import {
	findWatchHistory,
	saveWatchProgress,
} from "../infrastructure/watch-history/client";
import { migrateLegacyWatchHistory } from "../infrastructure/watch-history/legacy-migration";
import {
	loadYouTubeIframeApi,
	YouTubePlayerState,
	type YouTubePlayer,
} from "../infrastructure/youtube/iframe-api";

type Props = {
	embedUrl: string;
	talkId: string;
	thumbnailUrl?: string | null;
	title: string;
};

type ResumePositionState = {
	ownerKey: string;
	seconds: number;
};

function buildAutoplayUrl(embedUrl: string, resumeSeconds: number): string {
	const separator = embedUrl.includes("?") ? "&" : "?";
	const start = resumeSeconds > 0 ? `&start=${resumeSeconds}` : "";
	return `${embedUrl}${separator}autoplay=1&enablejsapi=1${start}`;
}

function enableYouTubeApi(embedUrl: string): string {
	if (/[?&]enablejsapi=/.test(embedUrl)) return embedUrl;
	return `${embedUrl}${embedUrl.includes("?") ? "&" : "?"}enablejsapi=1`;
}

// CustomEvent.detail is untyped until this event-boundary predicate validates it.
/* oxlint-disable anti-slop/no-unknown-parameters */
function isLoadTalkPlayerEventDetail(
	detail: unknown,
): detail is LoadTalkPlayerEventDetail {
	return (
		typeof detail === "object" &&
		detail !== null &&
		"src" in detail &&
		typeof detail.src === "string"
	);
}
/* oxlint-enable anti-slop/no-unknown-parameters */

function readPlayerEventDetail(event: Event): LoadTalkPlayerEventDetail | null {
	if (!(event instanceof CustomEvent)) {
		return null;
	}
	const detail: unknown = event.detail;
	return isLoadTalkPlayerEventDetail(detail) ? { src: detail.src } : null;
}

export default function LiteYouTubeEmbed({
	embedUrl,
	talkId,
	thumbnailUrl,
	title,
}: Props) {
	const isSignedIn = useIsSignedIn();
	const resumeOwnerKey = isSignedIn ? talkId : "signed-out";
	const [resumePosition, setResumePosition] = useState<ResumePositionState>({
		ownerKey: "signed-out",
		seconds: 0,
	});
	const resumeSeconds =
		resumePosition.ownerKey === resumeOwnerKey ? resumePosition.seconds : 0;
	const autoplayUrl = useMemo(
		() => buildAutoplayUrl(embedUrl, resumeSeconds),
		[embedUrl, resumeSeconds],
	);
	const [playerSrc, setPlayerSrc] = useState<string | null>(null);
	const iframeRef = useRef<HTMLIFrameElement | null>(null);
	const playerRef = useRef<YouTubePlayer | null>(null);
	const intervalRef = useRef<number | null>(null);
	const saveProgressRef = useRef<() => void>(() => {});
	const cleanupPlayerRef = useRef<() => void>(() => {});

	const clearProgressInterval = useCallback(() => {
		if (intervalRef.current === null) return;
		window.clearInterval(intervalRef.current);
		intervalRef.current = null;
	}, []);

	const saveProgress = useCallback(() => {
		const player = playerRef.current;
		if (!player || !isSignedIn) return;

		try {
			void saveWatchProgress({
				durationSeconds: player.getDuration() || null,
				lastWatchedAt: new Date().toISOString(),
				positionSeconds: player.getCurrentTime(),
				talkId,
				thumbnailUrl: thumbnailUrl ?? null,
				title,
			}).catch(() => {});
		} catch {
			// Playback must remain usable when YouTube getter calls fail.
		}
	}, [isSignedIn, talkId, thumbnailUrl, title]);

	useEffect(() => {
		saveProgressRef.current = saveProgress;
	}, [saveProgress]);

	const cleanupPlayer = useCallback(() => {
		const player = playerRef.current;
		try {
			saveProgressRef.current();
		} finally {
			clearProgressInterval();
			playerRef.current = null;
			try {
				player?.destroy();
			} catch {
				// The iframe remains available even when the API player cannot destroy.
			}
		}
	}, [clearProgressInterval]);

	useEffect(() => {
		cleanupPlayerRef.current = cleanupPlayer;
	}, [cleanupPlayer]);

	useEffect(() => {
		if (!isSignedIn) return;

		const controller = new AbortController();
		void migrateLegacyWatchHistory()
			.catch(() => 0)
			.then(() => findWatchHistory(talkId, controller.signal))
			.then((entry) => {
				if (controller.signal.aborted) return;
				setResumePosition({
					ownerKey: talkId,
					seconds: entry ? getResumeSeconds(entry) : 0,
				});
			})
			.catch(() => {});

		return () => controller.abort();
	}, [isSignedIn, talkId]);

	const handlePlayerStateChange = useCallback(
		(event: { data: number }) => {
			if (event.data === YouTubePlayerState.PLAYING) {
				if (intervalRef.current === null) {
					intervalRef.current = window.setInterval(
						() => saveProgressRef.current(),
						15_000,
					);
				}
				return;
			}

			if (
				event.data === YouTubePlayerState.PAUSED ||
				event.data === YouTubePlayerState.ENDED
			) {
				try {
					saveProgressRef.current();
				} finally {
					clearProgressInterval();
				}
			}
		},
		[clearProgressInterval],
	);

	const initializePlayer = useCallback(async () => {
		const iframe = iframeRef.current;
		if (!iframe || !playerSrc) return;

		try {
			const youtube = await loadYouTubeIframeApi();
			if (iframe !== iframeRef.current) return;
			cleanupPlayer();
			playerRef.current = new youtube.Player(iframe, {
				events: { onStateChange: handlePlayerStateChange },
			});
		} catch {
			// The iframe keeps its normal autoplay URL when tracking is unavailable.
		}
	}, [cleanupPlayer, handlePlayerStateChange, playerSrc]);

	useEffect(() => {
		const handleLoadPlayer = (event: Event) => {
			const detail = readPlayerEventDetail(event);
			if (detail) {
				setPlayerSrc(enableYouTubeApi(detail.src));
			}
		};

		window.addEventListener(LOAD_TALK_PLAYER_EVENT, handleLoadPlayer);
		return () =>
			window.removeEventListener(LOAD_TALK_PLAYER_EVENT, handleLoadPlayer);
	}, []);

	useEffect(() => {
		const handlePageHide = () => saveProgressRef.current();
		window.addEventListener("pagehide", handlePageHide);
		return () => window.removeEventListener("pagehide", handlePageHide);
	}, []);

	useEffect(() => () => cleanupPlayerRef.current(), []);

	return (
		<div className="relative w-full aspect-video overflow-hidden rounded-lg bg-gray-100 shadow-sm">
			<iframe
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowFullScreen
				className="absolute inset-0 h-full w-full"
				key={playerSrc ?? "about:blank"}
				name="talk-player"
				onLoad={() => void initializePlayer()}
				ref={iframeRef}
				src={playerSrc ?? "about:blank"}
				title={title}
			/>
			{!playerSrc && (
				<button
					aria-label={`${title}を再生`}
					className="absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden bg-gray-900 text-white"
					onClick={() => setPlayerSrc(autoplayUrl)}
					type="button"
				>
					{thumbnailUrl && (
						<Image
							alt=""
							className="object-cover opacity-80"
							fetchPriority="high"
							fill
							priority
							sizes="(max-width: 896px) 100vw, 896px"
							src={thumbnailUrl}
							unoptimized
						/>
					)}
					<span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-red-600/95 shadow-lg transition hover:bg-red-700">
						<Play aria-hidden className="ml-1 h-8 w-8 fill-current" />
					</span>
				</button>
			)}
		</div>
	);
}
