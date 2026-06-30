"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GroupedVirtuosoHandle } from "react-virtuoso";
import { GroupedVirtuoso } from "react-virtuoso";
import {
	TALK_GALLERY_COLLECTION_PARAM,
	TALK_GALLERY_QUERY_PARAM,
	TALK_GALLERY_SERIES_PARAM,
} from "../application/talk/links";
import {
	parseContentCollectionId,
	parseContentSeriesId,
} from "../domain/content/collection";
import type {
	ContentCollectionId,
	ContentSeriesId,
} from "../domain/content/types";
import type { TalkGalleryItem } from "../domain/talk/types";
import {
	markTalkGalleryRestorePending,
	readAndConsumeTalkGalleryRestoreSnapshot,
	writeTalkGalleryVirtuosoState,
} from "../infrastructure/browser/talk-gallery-storage";
import DecadeJumpNav from "./talk-gallery/decade-jump-nav";
import TalkGalleryRow from "./talk-gallery/talk-gallery-row";
import TalkGallerySectionHeader from "./talk-gallery/talk-gallery-section-header";
import { useTalkGalleryData } from "./talk-gallery/use-talk-gallery-data";

type Props = {
	talks: TalkGalleryItem[];
};

export default function TalkGallery({ talks }: Props) {
	const virtuosoRef = useRef<GroupedVirtuosoHandle>(null);
	const [restoreStateFrom] = useState(() =>
		readAndConsumeTalkGalleryRestoreSnapshot(),
	);

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCollectionId, setSelectedCollectionId] = useState<
		ContentCollectionId | ""
	>("");
	const [selectedSeriesId, setSelectedSeriesId] = useState<
		ContentSeriesId | ""
	>("");

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const urlQuery = params.get(TALK_GALLERY_QUERY_PARAM)?.trim() ?? "";
		const urlCollectionId = parseContentCollectionId(
			params.get(TALK_GALLERY_COLLECTION_PARAM) ?? "",
		);
		const urlSeriesId = parseContentSeriesId(
			params.get(TALK_GALLERY_SERIES_PARAM) ?? "",
		);

		setSelectedCollectionId(urlCollectionId);
		setSelectedSeriesId(urlSeriesId);
		if (urlQuery) {
			setSearchQuery(urlQuery);
			return;
		}

		setSearchQuery("");
	}, []);

	useEffect(() => {
		const handleScrollToTop = () => {
			virtuosoRef.current?.scrollToIndex({
				index: 0,
				align: "start",
			});
		};
		window.addEventListener("app:scroll-to-top", handleScrollToTop);
		return () =>
			window.removeEventListener("app:scroll-to-top", handleScrollToTop);
	}, []);

	const {
		columns,
		filteredTalks,
		sections,
		groups,
		groupCounts,
		flatRows,
		hasSearchError,
		isSearchLoading,
		searchTokens,
		transcriptSnippetsByTalkId,
	} = useTalkGalleryData(
		talks,
		"date",
		searchQuery,
		selectedCollectionId,
		selectedSeriesId,
	);

	const updateGalleryFilters = useCallback(
		(
			nextQuery: string,
			nextCollectionId: ContentCollectionId | "",
			nextSeriesId: ContentSeriesId | "",
		) => {
			const normalizedQuery = nextQuery.trim();

			setSearchQuery(nextQuery);
			setSelectedCollectionId(nextCollectionId);
			setSelectedSeriesId(nextSeriesId);

			const nextUrl = new URL(window.location.href);
			if (normalizedQuery) {
				nextUrl.searchParams.set(TALK_GALLERY_QUERY_PARAM, normalizedQuery);
			} else {
				nextUrl.searchParams.delete(TALK_GALLERY_QUERY_PARAM);
			}
			if (nextCollectionId) {
				nextUrl.searchParams.set(
					TALK_GALLERY_COLLECTION_PARAM,
					nextCollectionId,
				);
			} else {
				nextUrl.searchParams.delete(TALK_GALLERY_COLLECTION_PARAM);
			}
			if (nextSeriesId) {
				nextUrl.searchParams.set(TALK_GALLERY_SERIES_PARAM, nextSeriesId);
			} else {
				nextUrl.searchParams.delete(TALK_GALLERY_SERIES_PARAM);
			}
			window.history.replaceState(
				null,
				"",
				`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
			);
		},
		[],
	);

	const updateSearchQuery = useCallback(
		(nextQuery: string) => {
			updateGalleryFilters(nextQuery, selectedCollectionId, selectedSeriesId);
		},
		[selectedCollectionId, selectedSeriesId, updateGalleryFilters],
	);

	const updateCollectionFilter = useCallback(
		(nextCollectionId: ContentCollectionId | "") => {
			updateGalleryFilters(
				searchQuery,
				nextCollectionId,
				nextCollectionId === "scripture_commentary" ? selectedSeriesId : "",
			);
		},
		[searchQuery, selectedSeriesId, updateGalleryFilters],
	);

	const updateSeriesFilter = useCallback(
		(nextSeriesId: ContentSeriesId | "") => {
			updateGalleryFilters(
				searchQuery,
				nextSeriesId ? "scripture_commentary" : selectedCollectionId,
				nextSeriesId,
			);
		},
		[searchQuery, selectedCollectionId, updateGalleryFilters],
	);

	const handleNavigateToTalk = useCallback(() => {
		markTalkGalleryRestorePending();
		virtuosoRef.current?.getState(writeTalkGalleryVirtuosoState);
	}, []);

	const handleJumpToGroup = useCallback((groupIndex: number) => {
		if (groupIndex === 0) {
			window.scrollTo({ top: 0, behavior: "smooth" });
			return;
		}
		virtuosoRef.current?.scrollToIndex({
			groupIndex,
			align: "start",
			behavior: "smooth",
		});
	}, []);

	const selectedCollectionLabel = selectedCollectionId
		? (talks.find((talk) => talk.collectionId === selectedCollectionId)
				?.collectionLabel ?? selectedCollectionId)
		: "";
	const selectedSeriesLabel = selectedSeriesId
		? (talks.find((talk) => talk.seriesId === selectedSeriesId)?.seriesLabel ??
			selectedSeriesId)
		: "";
	const hasActiveQuery = searchQuery.trim().length > 0;
	const hasActiveFilters =
		hasActiveQuery ||
		Boolean(selectedCollectionId) ||
		Boolean(selectedSeriesId);
	const totalMatched = filteredTalks.length;
	const shouldShowResultCount =
		hasActiveFilters && !isSearchLoading && !hasSearchError;
	const emptyMessage = isSearchLoading
		? "検索しています。"
		: hasSearchError
			? "検索結果を取得できませんでした。時間をおいて再度お試しください。"
			: hasActiveFilters
				? "検索条件に一致するデータが見つかりませんでした。条件を変えてお試しください。"
				: "現在表示できるデータがありません。";

	if (talks.length === 0) {
		return (
			<div className="rounded-lg border border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-600">
				現在表示できるデータがありません。しばらく時間をおいて再度お試しください。
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-10">
			<div className="sticky top-16 z-10 -mx-5 bg-white/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8 lg:top-20">
				<div className="flex flex-col gap-2">
					<div className="relative">
						<input
							aria-label="法話を検索"
							className="search-cancel-none w-full rounded-sm border border-[#d6c6ad] bg-white py-3 pl-4 pr-10 text-sm text-[#303030] placeholder:text-[#888] focus:border-[#9d7e4c] focus:outline-none focus:ring-2 focus:ring-[#9d7e4c]/15"
							onChange={(event) => {
								updateSearchQuery(event.target.value);
							}}
							placeholder="キーワード・文字起こしで検索"
							type="search"
							value={searchQuery}
						/>
						{hasActiveQuery && (
							<button
								aria-label="検索をクリア"
								className="absolute inset-y-0 right-3 my-auto flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition hover:text-gray-900"
								onClick={() => {
									updateSearchQuery("");
								}}
								type="button"
							>
								<svg
									aria-hidden="true"
									className="h-4 w-4"
									fill="none"
									stroke="currentColor"
									strokeWidth={2}
									viewBox="0 0 24 24"
								>
									<path
										d="M6 6l12 12M6 18L18 6"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</button>
						)}
					</div>
					{selectedCollectionId && (
						<div className="flex flex-wrap items-center gap-2">
							<button
								className="inline-flex items-center gap-2 rounded-sm border border-[#d6c6ad] bg-[#fffbeb] px-2.5 py-1 text-xs font-medium text-[#5f5144] transition hover:border-[#9d7e4c] hover:text-[#303030]"
								onClick={() => {
									updateCollectionFilter("");
								}}
								type="button"
							>
								<span>{selectedCollectionLabel}</span>
								<span aria-hidden>×</span>
							</button>
						</div>
					)}
					{selectedSeriesId && (
						<div className="flex flex-wrap items-center gap-2">
							<button
								className="inline-flex items-center gap-2 rounded-sm border border-[#d6c6ad] bg-white px-2.5 py-1 text-xs font-medium text-[#5f5144] transition hover:border-[#9d7e4c] hover:text-[#303030]"
								onClick={() => {
									updateSeriesFilter("");
								}}
								type="button"
							>
								<span>{selectedSeriesLabel}</span>
								<span aria-hidden>×</span>
							</button>
						</div>
					)}
					{shouldShowResultCount && (
						<span className="text-xs text-gray-500">
							検索結果 {totalMatched} 件
						</span>
					)}
					{isSearchLoading && (
						<output className="text-xs text-gray-500">検索しています</output>
					)}
					{!hasActiveFilters && (
						<DecadeJumpNav groups={groups} onJumpToGroup={handleJumpToGroup} />
					)}
				</div>
			</div>

			{sections.length === 0 ? (
				<div className="rounded-lg border border-[#d6c6ad] bg-white p-10 text-center text-sm text-[#888]">
					{emptyMessage}
				</div>
			) : (
				<GroupedVirtuoso
					groupContent={(groupIndex) => {
						const group = groups[groupIndex];
						if (!group) {
							return null;
						}
						return (
							<TalkGallerySectionHeader
								isFirst={groupIndex === 0}
								searchTokens={searchTokens}
								section={group.section}
							/>
						);
					}}
					groupCounts={groupCounts}
					increaseViewportBy={{ top: 400, bottom: 600 }}
					itemContent={(itemIndex) => {
						const row = flatRows[itemIndex];
						if (!row) {
							return null;
						}
						return (
							<TalkGalleryRow
								columns={columns}
								isFirstRow={row.rowIndex === 0}
								onNavigateToTalk={handleNavigateToTalk}
								onSelectCollection={updateCollectionFilter}
								onSelectSeries={updateSeriesFilter}
								searchQuery={searchQuery}
								searchTokens={searchTokens}
								selectedCollectionId={selectedCollectionId}
								selectedSeriesId={selectedSeriesId}
								talks={row.talks}
								transcriptSnippetsByTalkId={transcriptSnippetsByTalkId}
							/>
						);
					}}
					ref={virtuosoRef}
					restoreStateFrom={restoreStateFrom}
					useWindowScroll
				/>
			)}
		</div>
	);
}
