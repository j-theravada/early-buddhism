"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
	LOAD_TALK_PLAYER_EVENT,
	type LoadTalkPlayerEventDetail,
} from "../application/talk/player-events";

type Props = {
	embedUrl: string;
	thumbnailUrl?: string | null;
	title: string;
};

function buildAutoplayUrl(embedUrl: string): string {
	return `${embedUrl}${embedUrl.includes("?") ? "&" : "?"}autoplay=1`;
}

function readPlayerEventDetail(event: Event): LoadTalkPlayerEventDetail | null {
	if (!(event instanceof CustomEvent)) {
		return null;
	}
	const detail = event.detail as Partial<LoadTalkPlayerEventDetail> | null;
	return typeof detail?.src === "string" ? { src: detail.src } : null;
}

export default function LiteYouTubeEmbed({
	embedUrl,
	thumbnailUrl,
	title,
}: Props) {
	const autoplayUrl = useMemo(() => buildAutoplayUrl(embedUrl), [embedUrl]);
	const [playerSrc, setPlayerSrc] = useState<string | null>(null);

	useEffect(() => {
		const handleLoadPlayer = (event: Event) => {
			const detail = readPlayerEventDetail(event);
			if (detail) {
				setPlayerSrc(detail.src);
			}
		};

		window.addEventListener(LOAD_TALK_PLAYER_EVENT, handleLoadPlayer);
		return () =>
			window.removeEventListener(LOAD_TALK_PLAYER_EVENT, handleLoadPlayer);
	}, []);

	return (
		<div className="relative w-full aspect-video overflow-hidden rounded-lg bg-gray-100 shadow-sm">
			<iframe
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowFullScreen
				className="absolute inset-0 h-full w-full"
				name="talk-player"
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
