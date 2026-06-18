import { useEffect, useMemo, useState } from "react";
import {
	buildDecadeSections,
	buildThemeSections,
	buildVirtualGalleryData,
} from "../../application/talk/grouping";
import {
	buildSearchIndex,
	filterTalksByQuery,
	tokenizeSearchQuery,
	type IndexedTalk,
} from "../../application/talk/search";
import {
	buildTalkSearchApiUrl,
	parseTalkSearchApiResponse,
	type ParsedTalkSearchApiResponse,
	type TalkSearchTranscriptSnippet,
} from "../../application/talk/search-api";
import type {
	ContentCollectionId,
	ContentSeriesId,
} from "../../domain/content/types";
import type { TalkForDisplay } from "../../domain/talk/types";
type ViewMode = "date" | "theme";

const MEDIA_QUERY_SM = "(min-width: 640px)";
const MEDIA_QUERY_LG = "(min-width: 1024px)";
const SEARCH_DEBOUNCE_MS = 150;
export type TranscriptSnippet = TalkSearchTranscriptSnippet;

const EMPTY_TRANSCRIPT_SNIPPETS_BY_TALK_ID = new Map<
	string,
	TranscriptSnippet[]
>();

type ServerSearchResult = ParsedTalkSearchApiResponse & {
	query: string;
};

function resolveColumnsByViewport(): number {
	if (window.matchMedia(MEDIA_QUERY_LG).matches) {
		return 3;
	}
	if (window.matchMedia(MEDIA_QUERY_SM).matches) {
		return 2;
	}
	return 1;
}

function useResponsiveColumns() {
	const [columns, setColumns] = useState(1);

	useEffect(() => {
		const updateColumns = () => {
			setColumns(resolveColumnsByViewport());
		};

		const mediaQuerySm = window.matchMedia(MEDIA_QUERY_SM);
		const mediaQueryLg = window.matchMedia(MEDIA_QUERY_LG);

		updateColumns();
		mediaQuerySm.addEventListener("change", updateColumns);
		mediaQueryLg.addEventListener("change", updateColumns);

		return () => {
			mediaQuerySm.removeEventListener("change", updateColumns);
			mediaQueryLg.removeEventListener("change", updateColumns);
		};
	}, []);

	return columns;
}

function useServerSearchResult(searchQuery: string): ServerSearchResult | null {
	const normalizedSearchQuery = searchQuery.trim();
	const [serverSearchResult, setServerSearchResult] =
		useState<ServerSearchResult | null>(null);

	useEffect(() => {
		if (!normalizedSearchQuery) {
			setServerSearchResult(null);
			return;
		}

		const controller = new AbortController();
		const timeoutId = window.setTimeout(async () => {
			try {
				const response = await fetch(
					buildTalkSearchApiUrl(normalizedSearchQuery),
					{
						signal: controller.signal,
					},
				);
				if (!response.ok) {
					setServerSearchResult(null);
					return;
				}

				const data = await response.json();
				setServerSearchResult({
					query: normalizedSearchQuery,
					...parseTalkSearchApiResponse(data),
				});
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}
				setServerSearchResult(null);
			}
		}, SEARCH_DEBOUNCE_MS);

		return () => {
			controller.abort();
			window.clearTimeout(timeoutId);
		};
	}, [normalizedSearchQuery]);

	return serverSearchResult?.query === normalizedSearchQuery
		? serverSearchResult
		: null;
}

function filterTalksByCollection(
	talks: TalkForDisplay[],
	collectionId: ContentCollectionId | "",
): TalkForDisplay[] {
	if (!collectionId) {
		return talks;
	}

	return talks.filter((talk) => talk.collectionId === collectionId);
}

function filterTalksBySeries(
	talks: TalkForDisplay[],
	seriesId: ContentSeriesId | "",
): TalkForDisplay[] {
	if (!seriesId) {
		return talks;
	}

	return talks.filter((talk) => talk.seriesId === seriesId);
}

export function useTalkGalleryData(
	talks: TalkForDisplay[],
	viewMode: ViewMode,
	searchQuery: string,
	selectedCollectionId: ContentCollectionId | "" = "",
	selectedSeriesId: ContentSeriesId | "" = "",
) {
	const columns = useResponsiveColumns();
	const classificationFilteredTalks = useMemo(
		() =>
			filterTalksBySeries(
				filterTalksByCollection(talks, selectedCollectionId),
				selectedSeriesId,
			),
		[talks, selectedCollectionId, selectedSeriesId],
	);

	const indexedTalks: IndexedTalk[] = useMemo(
		() => buildSearchIndex(classificationFilteredTalks),
		[classificationFilteredTalks],
	);

	const searchTokens = useMemo(
		() => tokenizeSearchQuery(searchQuery),
		[searchQuery],
	);

	const metadataFilteredTalks = useMemo(
		() => filterTalksByQuery(indexedTalks, searchTokens),
		[indexedTalks, searchTokens],
	);
	const serverSearchResult = useServerSearchResult(searchQuery);

	const filteredTalks = useMemo(() => {
		if (searchTokens.length === 0 || serverSearchResult === null) {
			return metadataFilteredTalks;
		}

		return classificationFilteredTalks.filter((talk) =>
			serverSearchResult.talkIds.has(talk.id),
		);
	}, [
		classificationFilteredTalks,
		metadataFilteredTalks,
		searchTokens.length,
		serverSearchResult,
	]);
	const transcriptSnippetsByTalkId = useMemo(
		() =>
			serverSearchResult?.transcriptSnippetsByTalkId ??
			EMPTY_TRANSCRIPT_SNIPPETS_BY_TALK_ID,
		[serverSearchResult],
	);

	const sections = useMemo(() => {
		if (viewMode === "theme") {
			return buildThemeSections(filteredTalks);
		}
		return buildDecadeSections(filteredTalks);
	}, [filteredTalks, viewMode]);

	const virtualData = useMemo(() => {
		if (sections.length === 0) {
			return { groups: [], groupCounts: [], flatRows: [] };
		}
		return buildVirtualGalleryData(sections, columns);
	}, [columns, sections]);

	return {
		columns,
		filteredTalks,
		sections,
		searchTokens,
		transcriptSnippetsByTalkId,
		...virtualData,
	};
}
