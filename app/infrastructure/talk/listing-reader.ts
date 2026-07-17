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

let searchDataPromise: Promise<TranscriptAwareSearchData> | null = null;

function getSearchData() {
	searchDataPromise ??= Promise.all([
		getTalks(),
		getTranscriptSearchDocuments(),
	]).then(([talks, documents]) =>
		buildTranscriptAwareSearchData(talks, documents),
	);
	return searchDataPromise;
}

export const readTalkListingPage = createTalkListingReader({
	loadItems: async () => buildTalkGalleryItems(await getTalks()),
	findMatchingTalkIds: async (query) =>
		findTranscriptAwareTalkIds(await getSearchData(), query),
	buildTranscriptSnippets: async (query, talkIds) =>
		buildTranscriptSnippetsByTalkId(await getSearchData(), query, talkIds),
});
