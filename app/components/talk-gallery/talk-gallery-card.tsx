import { ExternalLink, Youtube } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { TalkForDisplay } from "../../domain/talk/types";
import { highlightMatches } from "./highlight";

type Props = {
	talk: TalkForDisplay;
	searchTokens: string[];
	onNavigateToTalk: () => void;
};

export default function TalkGalleryCard({
	talk,
	searchTokens,
	onNavigateToTalk,
}: Props) {
	return (
		<div className="group relative flex flex-col overflow-hidden rounded-lg border border-[#d6c6ad] bg-white shadow-sm transition duration-200 ease-out hover:border-[#9d7e4c] hover:shadow-md">
			{talk.dvdId && (
				<div className="pointer-events-none absolute right-3 top-3 z-10 rounded-full border border-[#d6c6ad] bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#303030] opacity-0 shadow-sm backdrop-blur-sm transition duration-150 group-hover:opacity-100">
					DVD ID: {talk.dvdId}
				</div>
			)}
			<Link
				className="flex flex-col flex-1"
				href={`/talks/${encodeURIComponent(talk.id)}`}
				onClick={onNavigateToTalk}
			>
				{/* 上半分: サムネイル */}
				{talk.thumbnailUrl && (
					<div className="relative aspect-video w-full overflow-hidden bg-[#fffbeb]">
						<Image
							alt={talk.title || "YouTube thumbnail"}
							className="object-cover transition-transform duration-200 group-hover:scale-105"
							fill
							sizes="(max-width: 768px) 100vw, 50vw"
							src={talk.thumbnailUrl}
							unoptimized
						/>
					</div>
				)}

				{/* 下半分: データ */}
				<div className="flex flex-col flex-1 p-6">
					<h2 className="text-lg font-bold text-[#303030] sm:text-xl">
						{highlightMatches(talk.title, searchTokens)}
					</h2>
					{talk.subtitle && (
						<p className="mt-2 text-sm leading-relaxed text-[#666]">
							{highlightMatches(talk.subtitle, searchTokens)}
						</p>
					)}
				</div>
			</Link>

			<div className="px-6 pb-6 flex items-center justify-between gap-3">
				<div className="flex items-baseline gap-2">
					<span className="text-xs text-[#888]">
						{highlightMatches(talk.recordedOnFormatted, searchTokens)}
					</span>
				</div>
				{talk.youtubeUrl && (
					<a
						className="inline-flex items-center gap-2 rounded-full border border-red-500 bg-white px-5 py-2.5 text-xs font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700 sm:text-sm"
						href={talk.youtubeUrl}
						rel="noopener noreferrer"
						target="_blank"
					>
						<Youtube className="h-4 w-4" />
						<span>YouTube</span>
						<ExternalLink className="h-3 w-3" />
					</a>
				)}
			</div>

			{(talk.audioLink || talk.attachmentsLink) && (
				<div className="px-6 pb-6 flex flex-wrap gap-3">
					{talk.audioLink && (
						<a
							className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-xs font-medium text-white transition hover:bg-gray-800 sm:text-sm"
							href={talk.audioLink}
							rel="noopener noreferrer"
							target="_blank"
						>
							音声を聴く
							<span aria-hidden>↗</span>
						</a>
					)}
					{talk.attachmentsLink && (
						<a
							className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 sm:text-sm"
							href={talk.attachmentsLink}
							rel="noopener noreferrer"
							target="_blank"
						>
							資料を見る
							<span aria-hidden>↗</span>
						</a>
					)}
				</div>
			)}
		</div>
	);
}
