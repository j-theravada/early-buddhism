import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
	getFirstSearchParam,
	getSearchParamValues,
	buildTalksHref,
} from "../application/talk/links";
import { areAllSearchFieldsSelected } from "../application/talk/search";
import ClientHomeActions from "../components/client-home-actions";
import Footer from "../components/footer";
import Header from "../components/header";
import TalkListing from "../components/talk-listing";
import { readTalkListingPage } from "../infrastructure/talk/listing-reader";
import { buildCanonicalUrl } from "../utils/seo";

export type TalkListingSearchParams = Partial<
	Record<
		"query" | "collection" | "series" | "fields",
		string | string[] | undefined
	>
>;

export async function renderTalkListingPage({
	page,
	searchParams,
}: {
	page: string;
	searchParams?: Promise<TalkListingSearchParams>;
}) {
	const params = (await searchParams) ?? {};
	const listing = await readTalkListingPage({
		page,
		query: getFirstSearchParam(params.query),
		collectionId: getFirstSearchParam(params.collection),
		seriesId: getFirstSearchParam(params.series),
		searchFields: getSearchParamValues(params.fields),
	});
	if (!listing) notFound();

	return (
		<div className="min-h-screen flex flex-col bg-white text-[#303030]">
			<div className="flex-1">
				<Header />
				<main>
					<section
						className="home-gallery-bg min-h-screen px-5 pb-16 pt-28 sm:px-8 lg:pb-24 lg:pt-36"
						id="talks"
					>
						<div className="mx-auto max-w-7xl">
							<h1 className="home-section-title text-center font-display text-[28px] font-semibold">
								動画一覧
							</h1>
							<div className="mt-10">
								<TalkListing listing={listing} />
							</div>
						</div>
					</section>
				</main>
			</div>
			<ClientHomeActions />
			<Footer />
		</div>
	);
}

export function buildTalkListingMetadata(
	page: number,
	params: TalkListingSearchParams,
): Metadata {
	const hasConditions =
		[
			getFirstSearchParam(params.query),
			getFirstSearchParam(params.collection),
			getFirstSearchParam(params.series),
		].some((value) => value.trim().length > 0) ||
		!areAllSearchFieldsSelected(getSearchParamValues(params.fields));
	const title = page > 1 ? `動画一覧 ${page}ページ目` : "動画一覧";
	const base = {
		title,
		description: `スマナサーラ長老の法話動画一覧${page > 1 ? `の${page}ページ目` : ""}です。`,
	};
	if (hasConditions) {
		return {
			...base,
			robots: { index: false, follow: true },
		};
	}
	return {
		...base,
		alternates: {
			canonical: buildCanonicalUrl(buildTalksHref({ page })),
		},
	};
}
