"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { TalkForDisplay } from "../domain/talk/types";

const TalkGallery = dynamic(() => import("./talk-gallery"));

const PREVIEW_COUNT = 8;
const IDLE_LOAD_DELAY_MS = 1500;

type Props = {
	talks: TalkForDisplay[];
};

function buildPreviewTalks(talks: TalkForDisplay[]) {
	return talks.slice(0, PREVIEW_COUNT);
}

export default function DeferredTalkGallery({ talks }: Props) {
	const [shouldLoadFullGallery, setShouldLoadFullGallery] = useState(false);
	const sentinelRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (shouldLoadFullGallery) {
			return;
		}

		let cancelled = false;
		let idleTimer: ReturnType<typeof setTimeout> | null = null;
		let observer: IntersectionObserver | null = null;

		const load = () => {
			if (!cancelled) {
				setShouldLoadFullGallery(true);
			}
		};

		idleTimer = setTimeout(load, IDLE_LOAD_DELAY_MS);

		if ("IntersectionObserver" in window && sentinelRef.current) {
			observer = new IntersectionObserver(
				(entries) => {
					if (entries.some((entry) => entry.isIntersecting)) {
						load();
					}
				},
				{ rootMargin: "600px 0px" },
			);
			observer.observe(sentinelRef.current);
		}

		return () => {
			cancelled = true;
			if (idleTimer) {
				clearTimeout(idleTimer);
			}
			observer?.disconnect();
		};
	}, [shouldLoadFullGallery]);

	if (shouldLoadFullGallery) {
		return <TalkGallery talks={talks} />;
	}

	const previewTalks = buildPreviewTalks(talks);

	return (
		<div className="space-y-6">
			<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{previewTalks.map((talk) => (
					<Link
						className="rounded-lg border border-[#d6c6ad] bg-white p-5 shadow-sm transition hover:border-[#9d7e4c] hover:shadow-md"
						href={`/talks/${encodeURIComponent(talk.id)}`}
						key={talk.id}
					>
						<div className="space-y-2">
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
				検索と全件表示を読み込み中です。
			</div>

			<div aria-hidden className="h-px w-full" ref={sentinelRef} />
		</div>
	);
}
