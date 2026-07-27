import Link from "next/link";
import {
	buildTalksHref,
	type TalkGalleryHrefOptions,
} from "../application/talk/links";
import type { TalkListingConditions } from "../application/talk/listing";

export type VisibleTalkListingPage = number | "ellipsis";

export function buildVisibleTalkListingPages(
	currentPage: number,
	totalPages: number,
): VisibleTalkListingPage[] {
	if (totalPages <= 1) return [];
	const candidates = [
		1,
		currentPage - 1,
		currentPage,
		currentPage + 1,
		totalPages,
	]
		.filter((page) => page >= 1 && page <= totalPages)
		.filter((page, index, pages) => pages.indexOf(page) === index)
		.sort((left, right) => left - right);
	const visible: VisibleTalkListingPage[] = [];
	for (const page of candidates) {
		const previous = visible.at(-1);
		if (typeof previous === "number" && page - previous > 1) {
			visible.push("ellipsis");
		}
		visible.push(page);
	}
	return visible;
}

type Props = {
	conditions: TalkListingConditions;
	page: number;
	totalPages: number;
	previousPage: number | null;
	nextPage: number | null;
};

function buildPageHref(
	targetPage: number,
	conditions: TalkListingConditions,
): string {
	const options: TalkGalleryHrefOptions = {
		page: targetPage,
		query: conditions.query,
		collectionId: conditions.collectionId,
		seriesId: conditions.seriesId,
		searchFields: conditions.searchFields,
	};
	return buildTalksHref(options);
}

export default function TalkListingPagination({
	conditions,
	page,
	totalPages,
	previousPage,
	nextPage,
}: Props) {
	if (totalPages <= 1) return null;

	const visiblePages = buildVisibleTalkListingPages(page, totalPages);
	return (
		<nav
			aria-label="動画一覧のページ"
			className="flex flex-wrap items-center justify-center gap-2 text-sm"
		>
			{previousPage && (
				<Link
					aria-current={previousPage === page ? "page" : undefined}
					className="inline-flex min-h-9 items-center justify-center rounded-full border border-[#d6c6ad] px-3 text-[#5f5144] transition hover:border-[#9d7e4c] hover:text-[#303030]"
					href={buildPageHref(previousPage, conditions)}
					prefetch={false}
				>
					← 前へ
				</Link>
			)}
			{visiblePages.map((targetPage, index) =>
				targetPage === "ellipsis" ? (
					<span
						aria-hidden="true"
						className="px-1 text-gray-400"
						key={`ellipsis-${index}`}
					>
						…
					</span>
				) : (
					<Link
						aria-current={targetPage === page ? "page" : undefined}
						className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-[#d6c6ad] px-2 text-[#5f5144] transition hover:border-[#9d7e4c] hover:text-[#303030] aria-[current=page]:border-[#9d7e4c] aria-[current=page]:bg-[#fffbeb] aria-[current=page]:font-semibold aria-[current=page]:text-[#303030]"
						href={buildPageHref(targetPage, conditions)}
						key={targetPage}
						prefetch={false}
					>
						{targetPage}
					</Link>
				),
			)}
			{nextPage && (
				<Link
					aria-current={nextPage === page ? "page" : undefined}
					className="inline-flex min-h-9 items-center justify-center rounded-full border border-[#d6c6ad] px-3 text-[#5f5144] transition hover:border-[#9d7e4c] hover:text-[#303030]"
					href={buildPageHref(nextPage, conditions)}
					prefetch={false}
				>
					次へ →
				</Link>
			)}
		</nav>
	);
}
