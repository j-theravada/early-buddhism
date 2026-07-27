"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buildTalkDetailHref } from "../application/talk/links";
import type { WatchHistoryEntry } from "../application/watch-history";
import { readWatchHistory } from "../infrastructure/browser/watch-history-storage";

const formatPlaybackTime = (seconds: number): string => {
	const roundedSeconds = Math.floor(seconds);
	const hours = Math.floor(roundedSeconds / 3600);
	const minutes = Math.floor((roundedSeconds % 3600) / 60);
	const remainingSeconds = roundedSeconds % 60;
	const minuteLabel = String(minutes).padStart(2, "0");
	const secondLabel = String(remainingSeconds).padStart(2, "0");

	return hours > 0
		? `${hours}:${minuteLabel}:${secondLabel}`
		: `${minuteLabel}:${secondLabel}`;
};

const formatLastWatchedAt = (value: string): string =>
	new Intl.DateTimeFormat("ja-JP", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(new Date(value));

const sortByLastWatchedAt = (entries: WatchHistoryEntry[]) =>
	[...entries].sort(
		(a, b) => Date.parse(b.lastWatchedAt) - Date.parse(a.lastWatchedAt),
	);

export function WatchHistoryEntries({
	entries,
}: {
	entries: WatchHistoryEntry[];
}) {
	if (entries.length === 0) {
		return (
			<div className="rounded-lg border border-[#d6c6ad] bg-[#fffbeb] p-6 text-center">
				<p className="font-medium text-[#303030]">視聴履歴はまだありません</p>
				<p className="mt-2 text-sm leading-relaxed text-[#5f5144]">
					動画を30秒以上再生すると、ここから続きの位置を確認できます。
				</p>
				<Link
					className="mt-4 inline-flex rounded-full border border-[#9d7e4c] bg-white px-5 py-2.5 text-sm font-medium text-[#5f5144] transition hover:bg-[#fffbeb]"
					href="/talks"
					prefetch={false}
				>
					動画一覧を見る
				</Link>
			</div>
		);
	}

	return (
		<ul className="space-y-4">
			{sortByLastWatchedAt(entries).map((entry) => {
				const detailHref = buildTalkDetailHref(entry.talkId);
				const positionLabel = formatPlaybackTime(entry.positionSeconds);
				const durationLabel =
					entry.durationSeconds === null
						? "時間不明"
						: formatPlaybackTime(entry.durationSeconds);

				return (
					<li
						className="overflow-hidden rounded-lg border border-[#d6c6ad] bg-white shadow-sm"
						key={entry.talkId}
					>
						<div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
							{entry.thumbnailUrl ? (
								<Link
									className="block shrink-0"
									href={detailHref}
									prefetch={false}
								>
									<Image
										alt={entry.title}
										className="aspect-video w-full rounded-sm object-cover sm:w-48"
										height={108}
										src={entry.thumbnailUrl}
										unoptimized
										width={192}
									/>
								</Link>
							) : null}
							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-center gap-2">
									{entry.completed ? (
										<span className="rounded-sm border border-[#d6c6ad] bg-[#fffbeb] px-2 py-1 text-xs font-medium text-[#5f5144]">
											視聴済み
										</span>
									) : null}
								</div>
								<h2 className="mt-2 text-lg font-bold text-[#303030]">
									<Link
										className="transition hover:text-[#9d7e4c]"
										href={detailHref}
										prefetch={false}
									>
										{entry.title}
									</Link>
								</h2>
								<p className="mt-2 text-sm text-[#5f5144]">
									{positionLabel} / {durationLabel}
								</p>
								<p className="mt-1 text-sm text-[#666]">
									最終視聴: {formatLastWatchedAt(entry.lastWatchedAt)}
								</p>
								<Link
									className="mt-4 inline-flex rounded-full border border-[#9d7e4c] px-4 py-2 text-sm font-medium text-[#5f5144] transition hover:bg-[#fffbeb]"
									href={detailHref}
									prefetch={false}
								>
									{entry.completed ? "もう一度見る" : "続きから再生"}
								</Link>
							</div>
						</div>
					</li>
				);
			})}
		</ul>
	);
}

export default function WatchHistoryList() {
	const [entries, setEntries] = useState<WatchHistoryEntry[] | null>(null);

	useEffect(() => {
		setEntries(readWatchHistory());
	}, []);

	if (entries === null) {
		return <div aria-hidden className="min-h-32" />;
	}

	return <WatchHistoryEntries entries={entries} />;
}
