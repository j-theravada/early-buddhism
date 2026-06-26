"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
	TALK_GALLERY_COLLECTION_PARAM,
	TALK_GALLERY_QUERY_PARAM,
	TALK_GALLERY_SERIES_PARAM,
} from "../application/talk/links";
import type { TalkGalleryItem } from "../domain/talk/types";

const TalkGallery = dynamic(() => import("./talk-gallery"), {
	loading: () => null,
});

const TALK_GALLERY_DATA_URL = "/api/talk-gallery";
const GALLERY_LOAD_IDLE_TIMEOUT_MS = 1500;
const GALLERY_LOAD_FALLBACK_DELAY_MS = 250;

type IdleWindow = Window &
	typeof globalThis & {
		requestIdleCallback?: (
			callback: () => void,
			options?: { timeout?: number },
		) => number;
		cancelIdleCallback?: (handle: number) => void;
	};

type LoadState =
	| {
			status: "loading";
			talks: null;
	  }
	| {
			status: "ready";
			talks: TalkGalleryItem[];
	  }
	| {
			status: "error";
			talks: null;
	  };

type Props = {
	initialTalks: TalkGalleryItem[];
};

function parseTalkGalleryData(value: unknown): TalkGalleryItem[] {
	if (!Array.isArray(value)) {
		throw new Error("Talk gallery data must be an array.");
	}
	return value as TalkGalleryItem[];
}

function hasGalleryUrlState(): boolean {
	const searchParams = new URLSearchParams(window.location.search);
	return (
		Boolean(searchParams.get(TALK_GALLERY_QUERY_PARAM)?.trim()) ||
		Boolean(searchParams.get(TALK_GALLERY_COLLECTION_PARAM)) ||
		Boolean(searchParams.get(TALK_GALLERY_SERIES_PARAM))
	);
}

function scheduleGalleryLoad(callback: () => void): () => void {
	if (hasGalleryUrlState()) {
		callback();
		return () => {};
	}

	const idleWindow = window as IdleWindow;
	if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
		const handle = idleWindow.requestIdleCallback(callback, {
			timeout: GALLERY_LOAD_IDLE_TIMEOUT_MS,
		});
		return () => idleWindow.cancelIdleCallback?.(handle);
	}

	const timeoutId = window.setTimeout(callback, GALLERY_LOAD_FALLBACK_DELAY_MS);
	return () => window.clearTimeout(timeoutId);
}

function PreviewGallery({
	initialTalks,
	status,
}: {
	initialTalks: TalkGalleryItem[];
	status: LoadState["status"];
}) {
	return (
		<div className="space-y-6">
			<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{initialTalks.map((talk, index) => (
					<Link
						className="group overflow-hidden rounded-lg border border-[#d6c6ad] bg-white shadow-sm transition hover:border-[#9d7e4c] hover:shadow-md"
						href={`/talks/${encodeURIComponent(talk.id)}`}
						key={talk.id}
						prefetch={false}
					>
						{talk.thumbnailUrl && (
							<div className="relative aspect-video w-full overflow-hidden bg-[#fffbeb]">
								<Image
									alt={talk.title || "YouTube thumbnail"}
									className="object-cover transition-transform duration-200 group-hover:scale-105"
									fill
									priority={index === 0}
									sizes="(max-width: 768px) 100vw, 33vw"
									src={talk.thumbnailUrl}
									unoptimized
								/>
							</div>
						)}
						<div className="space-y-2 p-5">
							<p className="text-xs text-[#888]">{talk.recordedOnFormatted}</p>
							<h2 className="text-base font-semibold text-[#303030]">
								{talk.title}
							</h2>
							{talk.subtitle && (
								<p className="text-sm leading-relaxed text-[#666]">
									{talk.subtitle}
								</p>
							)}
						</div>
					</Link>
				))}
			</div>

			<div className="rounded-lg border border-dashed border-[#d6c6ad] bg-[#fffbeb]/70 px-4 py-3 text-sm text-[#9d7e4c]">
				{status === "error"
					? "全件データを読み込めませんでした。時間をおいて再度お試しください。"
					: "全件データを読み込み中です。"}
			</div>
		</div>
	);
}

export default function TalkGalleryLoader({ initialTalks }: Props) {
	const [loadState, setLoadState] = useState<LoadState>({
		status: "loading",
		talks: null,
	});

	useEffect(() => {
		const controller = new AbortController();

		async function loadTalks() {
			try {
				const response = await fetch(TALK_GALLERY_DATA_URL, {
					signal: controller.signal,
				});
				if (!response.ok) {
					throw new Error(`Talk gallery request failed: ${response.status}`);
				}
				const talks = parseTalkGalleryData(await response.json());
				setLoadState({
					status: "ready",
					talks,
				});
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}
				setLoadState({
					status: "error",
					talks: null,
				});
			}
		}

		const cancelScheduledLoad = scheduleGalleryLoad(() => {
			void loadTalks();
		});

		return () => {
			cancelScheduledLoad();
			controller.abort();
		};
	}, []);

	if (loadState.status === "ready") {
		return <TalkGallery talks={loadState.talks} />;
	}

	return (
		<PreviewGallery initialTalks={initialTalks} status={loadState.status} />
	);
}
