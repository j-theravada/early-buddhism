import type { Metadata } from "next";
import { parseTalkListingPageNumber } from "../../../application/talk/listing";
import { readTalkListingPage } from "../../../infrastructure/talk/listing-reader";
import {
	buildTalkListingMetadata,
	renderTalkListingPage,
	type TalkListingSearchParams,
} from "../../talk-listing-page";

type Props = {
	params: Promise<{ page: string }>;
	searchParams?: Promise<TalkListingSearchParams>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
	const firstPage = await readTalkListingPage({ page: "1" });
	if (!firstPage) return [];
	return Array.from(
		{ length: Math.max(0, firstPage.totalPages - 1) },
		(_, index) => ({ page: String(index + 2) }),
	);
}

export async function generateMetadata({
	params,
	searchParams,
}: Props): Promise<Metadata> {
	const { page: rawPage } = await params;
	const page = parseTalkListingPageNumber(rawPage);
	if (!page) return { title: "動画一覧" };
	return buildTalkListingMetadata(page, (await searchParams) ?? {});
}

export default async function TalkListingNumberedPage({
	params,
	searchParams,
}: Props) {
	const { page } = await params;
	return renderTalkListingPage({ page, searchParams });
}
