import Link from "next/link";
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
	"inline-flex items-center gap-2 rounded-sm border border-[#d6c6ad] bg-[#fffbeb] px-2.5 py-1 text-xs font-medium text-[#5f5144] transition hover:border-[#9d7e4c] hover:text-[#303030]";
const filterLinkClass =
	"shrink-0 rounded-sm border border-[#d6c6ad] bg-white px-2.5 py-1 text-xs font-medium text-[#5f5144] transition hover:border-[#9d7e4c] hover:text-[#303030]";

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

	return (
		<div className="flex flex-col gap-10">
			<div className="sticky top-16 z-10 -mx-5 bg-white/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8 lg:top-20">
				<form action="/talks" className="space-y-3" method="get">
					<div className="flex gap-2">
						<input
							aria-label="法話を検索"
							className="search-cancel-none w-full min-w-0 rounded-sm border border-[#d6c6ad] bg-white py-3 pl-4 pr-10 text-sm text-[#303030] placeholder:text-[#888] focus:border-[#9d7e4c] focus:outline-none focus:ring-2 focus:ring-[#9d7e4c]/15"
							defaultValue={conditions.query}
							name="query"
							placeholder="キーワードで検索"
							type="search"
						/>
						<button
							className="min-w-20 shrink-0 rounded-sm border border-[#9d7e4c] bg-white px-4 py-3 text-sm font-medium text-[#303030] transition hover:bg-[#9d7e4c] hover:text-white focus-visible:bg-[#9d7e4c] focus-visible:text-white focus-visible:outline-none sm:min-w-48"
							type="submit"
						>
							検索
						</button>
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
					<fieldset className="rounded-sm border border-[#eadfce] bg-[#fffcf5] px-3 py-2.5">
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
								<label className="inline-flex items-center gap-1.5" key={id}>
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
				</form>

				<div className="mt-3 flex flex-wrap gap-2">
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
							className="inline-flex items-center px-1 text-xs font-medium text-gray-500 underline-offset-4 transition hover:text-gray-900 hover:underline"
							href="/talks"
							prefetch={false}
						>
							すべて解除
						</Link>
					)}
				</div>

				<nav
					aria-label="分類で絞り込む"
					className="scrollbar-none mt-3 flex gap-3 overflow-x-auto"
				>
					{listing.collectionOptions.map((option) => (
						<Link
							className={filterLinkClass}
							href={buildTalksHref({
								query: conditions.query,
								searchFields: conditions.searchFields,
								collectionId: option.id,
								seriesId:
									option.id === "scripture_commentary"
										? conditions.seriesId
										: "",
							})}
							key={option.id}
							prefetch={false}
						>
							{option.label}
						</Link>
					))}
				</nav>

				{conditions.collectionId === "scripture_commentary" && (
					<nav
						aria-label="シリーズで絞り込む"
						className="scrollbar-none mt-2 flex gap-3 overflow-x-auto"
					>
						{listing.seriesOptions
							.filter(
								(option) => option.collectionId === "scripture_commentary",
							)
							.map((option) => (
								<Link
									className={filterLinkClass}
									href={buildTalksHref({
										query: conditions.query,
										collectionId: "scripture_commentary",
										seriesId: option.id,
										searchFields: conditions.searchFields,
									})}
									key={option.id}
									prefetch={false}
								>
									{option.label}
								</Link>
							))}
					</nav>
				)}

				<p className="mt-3 text-xs text-gray-500">
					{listing.totalItems === 0
						? "全0件"
						: `全${listing.totalItems}件中 ${listing.rangeStart}〜${listing.rangeEnd}件`}
				</p>
				<DecadeJumpNav
					conditions={conditions}
					targets={listing.decadeTargets}
				/>
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
