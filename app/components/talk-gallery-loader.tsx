"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { type RefObject, useEffect, useRef, useState } from "react";
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
const GALLERY_LOAD_ROOT_MARGIN = "600px 0px";
const GALLERY_LOAD_FALLBACK_DELAY_MS = 1000;

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

function observeGalleryLoadTrigger(
	target: HTMLElement | null,
	callback: () => void,
): () => void {
	if (hasGalleryUrlState()) {
		callback();
		return () => {};
	}

	if (target && "IntersectionObserver" in window) {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					callback();
					observer.disconnect();
				}
			},
			{
				rootMargin: GALLERY_LOAD_ROOT_MARGIN,
			},
		);
		observer.observe(target);
		return () => observer.disconnect();
	}

	const timeoutId = window.setTimeout(callback, GALLERY_LOAD_FALLBACK_DELAY_MS);
	return () => window.clearTimeout(timeoutId);
}

function getLoadingMessage(status: LoadState["status"]): string {
	if (status === "error") {
		return "全件データを読み込めませんでした。時間をおいて再度お試しください。";
	}
	return "続きを読み込んでいます。";
}

function PreviewGallery({
	initialTalks,
	loadTriggerRef,
	status,
}: {
	initialTalks: TalkGalleryItem[];
	loadTriggerRef: RefObject<HTMLDivElement | null>;
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
									fetchPriority={index === 0 ? "high" : "auto"}
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

			<div
				className="rounded-lg border border-dashed border-[#d6c6ad] bg-[#fffbeb]/70 px-4 py-3 text-sm text-[#9d7e4c]"
				ref={loadTriggerRef}
			>
				{getLoadingMessage(status)}
			</div>
		</div>
	);
}

export default function TalkGalleryLoader({ initialTalks }: Props) {
	const loadTriggerRef = useRef<HTMLDivElement | null>(null);
	const [shouldLoad, setShouldLoad] = useState(false);
	const [loadState, setLoadState] = useState<LoadState>({
		status: "loading",
		talks: null,
	});

	useEffect(() => {
		if (shouldLoad) {
			return;
		}

		return observeGalleryLoadTrigger(loadTriggerRef.current, () => {
			setShouldLoad(true);
		});
	}, [shouldLoad]);

	useEffect(() => {
		if (!shouldLoad) {
			return;
		}

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

		void loadTalks();

		return () => controller.abort();
	}, [shouldLoad]);

	if (loadState.status === "ready") {
		return <TalkGallery talks={loadState.talks} />;
	}

	return (
		<PreviewGallery
			initialTalks={initialTalks}
			loadTriggerRef={loadTriggerRef}
			status={loadState.status}
		/>
	);
}
