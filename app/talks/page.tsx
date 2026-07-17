import type { Metadata } from "next";
import {
	buildTalkListingMetadata,
	renderTalkListingPage,
	type TalkListingSearchParams,
} from "./talk-listing-page";

type Props = {
	searchParams?: Promise<TalkListingSearchParams>;
};

export async function generateMetadata({
	searchParams,
}: Props): Promise<Metadata> {
	return buildTalkListingMetadata(1, (await searchParams) ?? {});
}

export default function TalksPage({ searchParams }: Props) {
	return renderTalkListingPage({ page: "1", searchParams });
}
