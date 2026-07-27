import { buildTalkGalleryItems } from "../../application/talk/gallery";
import { createTalkListingReader } from "../../application/talk/listing-reader";
import {
	buildTranscriptAwareSearchData,
	buildTranscriptSnippetsByTalkId,
	findTranscriptAwareTalkIds,
	type TranscriptAwareSearchData,
} from "../../application/talk/transcript-search";
import { getTranscriptSearchDocuments } from "../transcript/search-repository";
import { getTalks } from "./repository";

export function createSearchDataLoader(
	load: () => Promise<TranscriptAwareSearchData>,
) {
	let searchDataPromise: Promise<TranscriptAwareSearchData> | null = null;
	return function getSearchData() {
		searchDataPromise ??= load().catch((error: unknown) => {
			searchDataPromise = null;
			throw error;
		});
		return searchDataPromise;
	};
}

const getSearchData = createSearchDataLoader(() =>
	Promise.all([getTalks(), getTranscriptSearchDocuments()]).then(
		([talks, documents]) => buildTranscriptAwareSearchData(talks, documents),
	),
);

export const readTalkListingPage = createTalkListingReader({
	loadItems: async () => buildTalkGalleryItems(await getTalks()),
	findMatchingTalkIds: async (query, searchFields) =>
		findTranscriptAwareTalkIds(await getSearchData(), query, searchFields),
	buildTranscriptSnippets: async (query, talkIds, searchFields) =>
		buildTranscriptSnippetsByTalkId(
			await getSearchData(),
			query,
			talkIds,
			searchFields,
		),
});
