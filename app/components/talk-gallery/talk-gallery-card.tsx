import { ExternalLink, Youtube } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
	buildTalkDetailHref,
	buildTranscriptCueHref,
} from "../../application/talk/links";
import type {
	ContentCollectionId,
	ContentSeriesId,
} from "../../domain/content/types";
import type { TalkGalleryItem } from "../../domain/talk/types";
import { highlightMatches } from "./highlight";
import type { TranscriptSnippet } from "./use-talk-gallery-data";

type Props = {
	talk: TalkGalleryItem;
	searchTokens: string[];
	searchQuery?: string;
	selectedCollectionId?: ContentCollectionId | "";
	selectedSeriesId?: ContentSeriesId | "";
	transcriptSnippets?: TranscriptSnippet[];
	thumbnailPriority?: boolean;
	onNavigateToTalk?: () => void;
	onSelectCollection?: (collectionId: ContentCollectionId) => void;
	onSelectSeries?: (seriesId: ContentSeriesId) => void;
};

export default function TalkGalleryCard({
	talk,
	searchTokens,
	searchQuery,
	selectedCollectionId = "",
	selectedSeriesId = "",
	transcriptSnippets = [],
	thumbnailPriority = false,
	onNavigateToTalk,
	onSelectCollection,
	onSelectSeries,
}: Props) {
	const talkDetailHref = buildTalkDetailHref(
		talk.id,
		searchQuery,
		selectedCollectionId,
		selectedSeriesId,
	);

	return (
		<div className="group relative flex flex-col overflow-hidden rounded-lg border border-[#d6c6ad] bg-white shadow-sm transition duration-200 ease-out hover:border-[#9d7e4c] hover:shadow-md">
			{talk.dvdId && (
				<div className="pointer-events-none absolute right-3 top-3 z-10 rounded-full border border-[#d6c6ad] bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#303030] opacity-0 shadow-sm backdrop-blur-sm transition duration-150 group-hover:opacity-100">
					DVD ID: {talk.dvdId}
				</div>
			)}
			{/* 上半分: サムネイル */}
			{talk.thumbnailUrl && (
				<Link
					className="block"
					href={talkDetailHref}
					prefetch={false}
					{...(onNavigateToTalk ? { onClick: onNavigateToTalk } : {})}
				>
					<div className="relative aspect-video w-full overflow-hidden bg-[#fffbeb]">
						<Image
							alt={talk.title || "YouTube thumbnail"}
							className="object-cover transition-transform duration-200 group-hover:scale-105"
							fetchPriority={thumbnailPriority ? "high" : "auto"}
							fill
							priority={thumbnailPriority}
							sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
							src={talk.thumbnailUrl}
							unoptimized
						/>
					</div>
				</Link>
			)}

			{/* 下半分: データ */}
			<div className="flex flex-col flex-1 p-6">
				<div className="mb-3 flex flex-wrap items-center gap-2">
					{onSelectCollection ? (
						<button
							aria-label={`${talk.collectionLabel}で絞り込む`}
							className="rounded-sm border border-[#d6c6ad] bg-[#fffbeb] px-2 py-1 text-[11px] font-medium text-[#5f5144] transition hover:border-[#9d7e4c] hover:text-[#303030]"
							onClick={() => {
								onSelectCollection(talk.collectionId);
							}}
							type="button"
						>
							{highlightMatches(talk.collectionLabel, searchTokens)}
						</button>
					) : (
						<span className="rounded-sm border border-[#d6c6ad] bg-[#fffbeb] px-2 py-1 text-[11px] font-medium text-[#5f5144]">
							{highlightMatches(talk.collectionLabel, searchTokens)}
						</span>
					)}
					{talk.seriesId && talk.seriesLabel && onSelectSeries ? (
						<button
							aria-label={`${talk.seriesLabel}で絞り込む`}
							className="rounded-sm border border-[#d6c6ad] bg-white px-2 py-1 text-[11px] font-medium text-[#5f5144] transition hover:border-[#9d7e4c] hover:text-[#303030]"
							onClick={() => {
								if (talk.seriesId) {
									onSelectSeries(talk.seriesId);
								}
							}}
							type="button"
						>
							{highlightMatches(talk.seriesLabel, searchTokens)}
						</button>
					) : talk.seriesId && talk.seriesLabel ? (
						<span className="rounded-sm border border-[#d6c6ad] bg-white px-2 py-1 text-[11px] font-medium text-[#5f5144]">
							{highlightMatches(talk.seriesLabel, searchTokens)}
						</span>
					) : null}
				</div>
				<Link
					className="block"
					href={talkDetailHref}
					prefetch={false}
					{...(onNavigateToTalk ? { onClick: onNavigateToTalk } : {})}
				>
					<h2 className="text-lg font-bold text-[#303030] sm:text-xl">
						{highlightMatches(talk.title, searchTokens)}
					</h2>
					{talk.subtitle && (
						<p className="mt-2 text-sm leading-relaxed text-[#666]">
							{highlightMatches(talk.subtitle, searchTokens)}
						</p>
					)}
				</Link>
			</div>

			{transcriptSnippets.length > 0 && (
				<div className="px-6 pb-4">
					<div className="border-l-2 border-amber-300 bg-amber-50/70 px-3 py-2.5">
						<p className="text-[11px] font-semibold text-amber-900">
							文字起こし
						</p>
						<div className="mt-1.5 space-y-1.5">
							{transcriptSnippets.map((snippet) => (
								<Link
									aria-label={`${snippet.startLabel ?? "該当箇所"}の文字起こしへ移動`}
									className="block rounded-sm text-xs leading-relaxed text-[#5f5144] transition hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9d7e4c]/25"
									href={buildTranscriptCueHref(
										talk.id,
										snippet.cueIndex,
										searchQuery,
										selectedCollectionId,
										selectedSeriesId,
									)}
									key={`${snippet.cueIndex}-${snippet.text}`}
									onClick={onNavigateToTalk}
									prefetch={false}
								>
									{snippet.startLabel && (
										<span className="mr-1 font-medium text-amber-700">
											{snippet.startLabel}
										</span>
									)}
									{highlightMatches(snippet.text, searchTokens)}
								</Link>
							))}
						</div>
					</div>
				</div>
			)}

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
