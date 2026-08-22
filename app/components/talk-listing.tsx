import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import {
	buildTalksHref,
	type TalkGalleryHrefOptions,
} from "../application/talk/links";
import {
	buildTalkListingSections,
	type TalkListingPage,
} from "../application/talk/listing";
import {
	areAllSearchFieldsSelected,
	normalizeSearchFields,
	SEARCH_FIELD_OPTIONS,
	tokenizeSearchQuery,
} from "../application/talk/search";
import DecadeJumpNav from "./talk-gallery/decade-jump-nav";
import TalkGalleryCard from "./talk-gallery/talk-gallery-card";
import TalkGallerySectionHeader from "./talk-gallery/talk-gallery-section-header";
import TalkListingPagination from "./talk-listing-pagination";

const activeConditionClass =
	"inline-flex shrink-0 items-center gap-2 rounded-sm border border-[#d6c6ad] bg-[#fffbeb] px-2.5 py-1 text-xs font-medium text-[#5f5144] transition hover:border-[#9d7e4c] hover:text-[#303030]";
const filterLinkClass =
	"shrink-0 rounded-sm border border-[#d6c6ad] bg-white px-2.5 py-1 text-xs font-medium text-[#5f5144] transition hover:border-[#9d7e4c] hover:text-[#303030]";
const activeFilterLinkClass =
	"shrink-0 rounded-sm border border-[#9d7e4c] bg-[#fffbeb] px-2.5 py-1 text-xs font-medium text-[#303030] transition hover:border-[#9d7e4c]";

export default function TalkListing({ listing }: { listing: TalkListingPage }) {
	const { conditions } = listing;
	const searchTokens = tokenizeSearchQuery(conditions.query);
	const selectedSearchFields = normalizeSearchFields(conditions.searchFields);
	const allSearchFieldsSelected =
		areAllSearchFieldsSelected(selectedSearchFields);
	const selectedSearchFieldLabels = SEARCH_FIELD_OPTIONS.filter(({ id }) =>
		selectedSearchFields.includes(id),
	).map(({ label }) => label);
	const sections = buildTalkListingSections(listing.items);
	const galleryOptions: TalkGalleryHrefOptions = {
		page: listing.page,
		query: conditions.query,
		collectionId: conditions.collectionId,
		seriesId: conditions.seriesId,
		searchFields: conditions.searchFields,
	};
	const collectionLabel = listing.collectionOptions.find(
		({ id }) => id === conditions.collectionId,
	)?.label;
	const seriesLabel = listing.seriesOptions.find(
		({ id }) => id === conditions.seriesId,
	)?.label;
	const hasActiveConditions = Boolean(
		conditions.query ||
		conditions.collectionId ||
		conditions.seriesId ||
		!allSearchFieldsSelected,
	);

	return (
		<div className="flex flex-col gap-10">
			<div className="sticky top-16 z-10 -mx-5 bg-white/95 px-5 py-2 backdrop-blur sm:-mx-8 sm:px-8 sm:py-2.5 lg:top-20">
				<form action="/talks" method="get">
					<div className="relative">
						<div className="flex items-stretch overflow-visible rounded-sm border border-[#d6c6ad] bg-white shadow-[0_2px_8px_rgba(95,81,68,0.04)] transition focus-within:border-[#9d7e4c] focus-within:ring-2 focus-within:ring-[#9d7e4c]/15">
							<label className="flex min-w-0 flex-1 items-center">
								<Search
									aria-hidden="true"
									className="ml-3.5 h-4 w-4 shrink-0 text-[#887966]"
									strokeWidth={1.8}
								/>
								<span className="sr-only">キーワード</span>
								<input
									aria-label="法話を検索"
									className="search-cancel-none min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-[#303030] outline-none placeholder:text-[#888]"
									defaultValue={conditions.query}
									name="query"
									placeholder="キーワードで検索"
									type="search"
								/>
							</label>
							<button
								aria-label="検索"
								className="flex h-11 w-11 shrink-0 items-center justify-center border-l border-[#eadfce] text-[#5f5144] transition hover:bg-[#9d7e4c] hover:text-white focus-visible:bg-[#9d7e4c] focus-visible:text-white focus-visible:outline-none"
								title="検索"
								type="submit"
							>
								<Search
									aria-hidden="true"
									className="h-[18px] w-[18px]"
									strokeWidth={1.8}
								/>
								<span className="sr-only">検索</span>
							</button>
							<details className="group relative shrink-0">
								<summary
									aria-label={`検索設定${hasActiveConditions ? "（条件あり）" : ""}`}
									className="relative flex h-11 w-11 cursor-pointer list-none items-center justify-center border-l border-[#eadfce] text-[#5f5144] transition hover:bg-[#fffcf5] hover:text-[#303030] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9d7e4c]/40 [&::-webkit-details-marker]:hidden"
									title="検索設定"
								>
									<SlidersHorizontal
										aria-hidden="true"
										className="h-[18px] w-[18px]"
										strokeWidth={1.8}
									/>
									{hasActiveConditions && (
										<span
											aria-hidden="true"
											className="absolute right-2.5 top-2 h-1.5 w-1.5 rounded-full bg-[#9d7e4c]"
										/>
									)}
									<span className="sr-only">検索設定</span>
								</summary>
								<div className="absolute right-0 top-full z-30 mt-2 max-h-[min(70svh,36rem)] w-[min(92vw,34rem)] max-w-[calc(100vw-2.5rem)] overflow-y-auto rounded-md border border-[#d6c6ad] bg-[#fffcf5] p-3 shadow-[0_10px_30px_rgba(95,81,68,0.16)]">
									<div className="mb-3 flex items-center justify-between gap-3">
										<p className="text-xs font-semibold text-[#5f5144]">
											検索設定
										</p>
										<p className="text-[11px] text-[#887966]">
											条件を選んで検索
										</p>
									</div>
									<fieldset className="rounded-sm border border-[#eadfce] bg-white/70 px-3 py-2.5">
										<legend className="px-1 text-xs font-semibold text-[#5f5144]">
											検索対象
										</legend>
										<p className="mb-2 text-[11px] text-[#887966]">
											「全て」を外すと、選択した項目だけを検索します。
										</p>
										<div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#5f5144]">
											<label className="inline-flex items-center gap-1.5">
												<input
													defaultChecked={allSearchFieldsSelected}
													name="fields"
													type="checkbox"
													value="all"
												/>
												全て
											</label>
											{SEARCH_FIELD_OPTIONS.map(({ id, label }) => (
												<label
													className="inline-flex items-center gap-1.5"
													key={id}
												>
													<input
														defaultChecked={
															!allSearchFieldsSelected &&
															selectedSearchFields.includes(id)
														}
														name="fields"
														type="checkbox"
														value={id}
													/>
													{label}
												</label>
											))}
										</div>
									</fieldset>

									<div className="mt-3">
										<p className="mb-2 text-xs font-semibold text-[#5f5144]">
											分類
										</p>
										<nav
											aria-label="分類で絞り込む"
											className="scrollbar-none flex gap-2 overflow-x-auto"
										>
											{listing.collectionOptions.map((option) => (
												<Link
													className={
														option.id === conditions.collectionId
															? activeFilterLinkClass
															: filterLinkClass
													}
													href={buildTalksHref({
														query: conditions.query,
														searchFields: conditions.searchFields,
														collectionId: option.id,
														seriesId:
															option.id === "scripture_commentary"
																? conditions.seriesId
																: "",
													})}
													aria-current={
														option.id === conditions.collectionId
															? "page"
															: undefined
													}
													key={option.id}
													prefetch={false}
												>
													{option.label}
												</Link>
											))}
										</nav>
									</div>

									{conditions.collectionId === "scripture_commentary" && (
										<div className="mt-3">
											<p className="mb-2 text-xs font-semibold text-[#5f5144]">
												シリーズ
											</p>
											<nav
												aria-label="シリーズで絞り込む"
												className="scrollbar-none flex gap-2 overflow-x-auto"
											>
												{listing.seriesOptions
													.filter(
														(option) =>
															option.collectionId === "scripture_commentary",
													)
													.map((option) => (
														<Link
															className={
																option.id === conditions.seriesId
																	? activeFilterLinkClass
																	: filterLinkClass
															}
															href={buildTalksHref({
																query: conditions.query,
																collectionId: "scripture_commentary",
																seriesId: option.id,
																searchFields: conditions.searchFields,
															})}
															aria-current={
																option.id === conditions.seriesId
																	? "page"
																	: undefined
															}
															key={option.id}
															prefetch={false}
														>
															{option.label}
														</Link>
													))}
											</nav>
										</div>
									)}
								</div>
							</details>
						</div>
					</div>
					{conditions.collectionId && (
						<input
							name="collection"
							type="hidden"
							value={conditions.collectionId}
						/>
					)}
					{conditions.seriesId && (
						<input name="series" type="hidden" value={conditions.seriesId} />
					)}
				</form>

				{hasActiveConditions && (
					<div className="scrollbar-none mt-2 flex flex-nowrap gap-2 overflow-x-auto">
						{!allSearchFieldsSelected && (
							<Link
								className={activeConditionClass}
								href={buildTalksHref({
									query: conditions.query,
									collectionId: conditions.collectionId,
									seriesId: conditions.seriesId,
								})}
								prefetch={false}
							>
								検索対象: {selectedSearchFieldLabels.join("・")} ×
							</Link>
						)}
						{conditions.query && (
							<Link
								className={activeConditionClass}
								href={buildTalksHref({
									searchFields: conditions.searchFields,
									collectionId: conditions.collectionId,
									seriesId: conditions.seriesId,
								})}
								prefetch={false}
							>
								検索: {conditions.query} ×
							</Link>
						)}
						{collectionLabel && (
							<Link
								className={activeConditionClass}
								href={buildTalksHref({
									query: conditions.query,
									searchFields: conditions.searchFields,
								})}
								prefetch={false}
							>
								{collectionLabel} ×
							</Link>
						)}
						{seriesLabel && (
							<Link
								className={activeConditionClass}
								href={buildTalksHref({
									query: conditions.query,
									collectionId: conditions.collectionId,
									searchFields: conditions.searchFields,
								})}
								prefetch={false}
							>
								{seriesLabel} ×
							</Link>
						)}
						{(conditions.query ||
							conditions.collectionId ||
							conditions.seriesId ||
							!allSearchFieldsSelected) && (
							<Link
								className="inline-flex shrink-0 items-center px-1 text-xs font-medium text-gray-500 underline-offset-4 transition hover:text-gray-900 hover:underline"
								href="/talks"
								prefetch={false}
							>
								すべて解除
							</Link>
						)}
					</div>
				)}

				<div className="mt-2 flex min-w-0 flex-nowrap items-center justify-between gap-3 overflow-hidden">
					<p className="text-xs text-gray-500">
						{listing.totalItems === 0
							? "全0件"
							: `全${listing.totalItems}件中 ${listing.rangeStart}〜${listing.rangeEnd}件`}
					</p>
					<div className="min-w-0 flex-1">
						<DecadeJumpNav
							conditions={conditions}
							targets={listing.decadeTargets}
						/>
					</div>
				</div>
			</div>

			{sections.length === 0 ? (
				<div className="rounded-lg border border-[#d6c6ad] bg-white p-10 text-center text-sm text-[#888]">
					検索条件に一致するデータが見つかりませんでした。条件を変えてお試しください。
				</div>
			) : (
				<div className="space-y-12">
					{sections.map((section, sectionIndex) => (
						<section
							className="scroll-mt-72 lg:scroll-mt-80"
							id={section.anchorId}
							key={section.label}
						>
							<TalkGallerySectionHeader
								count={section.items.length}
								isFirst={sectionIndex === 0}
								label={section.label}
								searchTokens={searchTokens}
							/>
							<div className="grid gap-8 pt-6 sm:grid-cols-2 lg:grid-cols-3">
								{section.items.map((talk) => {
									const pageIndex = listing.items.findIndex(
										(item) => item.id === talk.id,
									);
									return (
										<div data-talk-gallery-item key={talk.id}>
											<TalkGalleryCard
												galleryOptions={galleryOptions}
												searchTokens={searchTokens}
												talk={talk}
												thumbnailPriority={pageIndex < 3}
												transcriptSnippets={
													listing.transcriptSnippetsByTalkId.get(talk.id) ?? []
												}
											/>
										</div>
									);
								})}
							</div>
						</section>
					))}
				</div>
			)}

			<TalkListingPagination
				conditions={conditions}
				nextPage={listing.nextPage}
				page={listing.page}
				previousPage={listing.previousPage}
				totalPages={listing.totalPages}
			/>
		</div>
	);
}
