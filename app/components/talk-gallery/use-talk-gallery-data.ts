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

type ServerSearchState = {
	query: string;
	result: ServerSearchResult | null;
	status: "idle" | "loading" | "ready" | "error";
};

type CurrentServerSearchResult = {
	result: ServerSearchResult | null;
	isLoading: boolean;
	hasError: boolean;
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

function useServerSearchResult(searchQuery: string): CurrentServerSearchResult {
	const normalizedSearchQuery = searchQuery.trim();
	const [serverSearchState, setServerSearchState] = useState<ServerSearchState>(
		{
			query: "",
			result: null,
			status: "idle",
		},
	);

	useEffect(() => {
		if (!normalizedSearchQuery) {
			setServerSearchState({
				query: "",
				result: null,
				status: "idle",
			});
			return;
		}

		setServerSearchState({
			query: normalizedSearchQuery,
			result: null,
			status: "loading",
		});

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
					setServerSearchState({
						query: normalizedSearchQuery,
						result: null,
						status: "error",
					});
					return;
				}

				const data = await response.json();
				setServerSearchState({
					query: normalizedSearchQuery,
					result: {
						query: normalizedSearchQuery,
						...parseTalkSearchApiResponse(data),
					},
					status: "ready",
				});
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}
				setServerSearchState({
					query: normalizedSearchQuery,
					result: null,
					status: "error",
				});
			}
		}, SEARCH_DEBOUNCE_MS);

		return () => {
			controller.abort();
			window.clearTimeout(timeoutId);
		};
	}, [normalizedSearchQuery]);

	if (!normalizedSearchQuery) {
		return {
			result: null,
			isLoading: false,
			hasError: false,
		};
	}

	const isCurrentQuery = serverSearchState.query === normalizedSearchQuery;

	return {
		result:
			isCurrentQuery && serverSearchState.status === "ready"
				? serverSearchState.result
				: null,
		isLoading:
			!isCurrentQuery ||
			serverSearchState.status === "idle" ||
			serverSearchState.status === "loading",
		hasError: isCurrentQuery && serverSearchState.status === "error",
	};
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
	const {
		result: serverSearchResult,
		isLoading: isSearchLoading,
		hasError: hasSearchError,
	} = useServerSearchResult(searchQuery);

	const filteredTalks = useMemo(() => {
		if (searchTokens.length === 0) {
			return metadataFilteredTalks;
		}

		if (serverSearchResult === null) {
			return [];
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
		hasSearchError,
		isSearchLoading,
		sections,
		searchTokens,
		transcriptSnippetsByTalkId,
		...virtualData,
	};
}
