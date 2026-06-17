"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GroupedVirtuosoHandle } from "react-virtuoso";
import { GroupedVirtuoso } from "react-virtuoso";
import { TALK_GALLERY_QUERY_PARAM } from "../application/talk/links";
import type { TalkForDisplay } from "../domain/talk/types";
import DecadeJumpNav from "./talk-gallery/decade-jump-nav";
import TalkGalleryRow from "./talk-gallery/talk-gallery-row";
import TalkGallerySectionHeader from "./talk-gallery/talk-gallery-section-header";
import { useTalkGalleryData } from "./talk-gallery/use-talk-gallery-data";

type Props = {
	talks: TalkForDisplay[];
};

export default function TalkGallery({ talks }: Props) {
	const virtuosoRef = useRef<GroupedVirtuosoHandle>(null);

	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		const urlQuery =
			new URLSearchParams(window.location.search)
				.get(TALK_GALLERY_QUERY_PARAM)
				?.trim() ?? "";
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
		searchTokens,
		transcriptSnippetsByTalkId,
	} = useTalkGalleryData(talks, "date", searchQuery);

	const updateSearchQuery = useCallback((nextQuery: string) => {
		const normalizedQuery = nextQuery.trim();

		setSearchQuery(nextQuery);

		const nextUrl = new URL(window.location.href);
		if (normalizedQuery) {
			nextUrl.searchParams.set(TALK_GALLERY_QUERY_PARAM, normalizedQuery);
		} else {
			nextUrl.searchParams.delete(TALK_GALLERY_QUERY_PARAM);
		}
		window.history.replaceState(
			null,
			"",
			`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
		);
	}, []);

	const handleNavigateToTalk = useCallback(() => {}, []);

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

	const hasActiveQuery = searchQuery.trim().length > 0;
	const totalMatched = filteredTalks.length;

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
					{hasActiveQuery && (
						<span className="text-xs text-gray-500">
							検索結果 {totalMatched} 件
						</span>
					)}
					{!hasActiveQuery && (
						<DecadeJumpNav groups={groups} onJumpToGroup={handleJumpToGroup} />
					)}
				</div>
			</div>

			{sections.length === 0 ? (
				<div className="rounded-lg border border-[#d6c6ad] bg-white p-10 text-center text-sm text-[#888]">
					{hasActiveQuery
						? "検索条件に一致するデータが見つかりませんでした。条件を変えてお試しください。"
						: "現在表示できるデータがありません。"}
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
								searchQuery={searchQuery}
								searchTokens={searchTokens}
								talks={row.talks}
								transcriptSnippetsByTalkId={transcriptSnippetsByTalkId}
							/>
						);
					}}
					ref={virtuosoRef}
					useWindowScroll
				/>
			)}
		</div>
	);
}
