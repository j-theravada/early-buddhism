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
import type { TalkForDisplay } from "../../domain/talk/types";
type ViewMode = "date" | "theme";

const MEDIA_QUERY_SM = "(min-width: 640px)";
const MEDIA_QUERY_LG = "(min-width: 1024px)";
const SEARCH_DEBOUNCE_MS = 150;

type ServerSearchResponse = {
	talkIds?: unknown;
	results?: unknown;
};

export type TranscriptSnippet = {
	text: string;
	cueIndex: number;
	start?: number;
	startLabel?: string;
};

type ServerSearchResult = {
	query: string;
	talkIds: Set<string>;
	transcriptSnippetsByTalkId: Map<string, TranscriptSnippet[]>;
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

function parseServerSearchTalkIds(response: ServerSearchResponse): string[] {
	if (!Array.isArray(response.talkIds)) {
		return [];
	}

	return response.talkIds.filter(
		(talkId): talkId is string => typeof talkId === "string",
	);
}

function parseServerSearchSnippets(
	response: ServerSearchResponse,
): Map<string, TranscriptSnippet[]> {
	const snippetsByTalkId = new Map<string, TranscriptSnippet[]>();
	if (!Array.isArray(response.results)) {
		return snippetsByTalkId;
	}

	for (const item of response.results) {
		if (!item || typeof item !== "object") {
			continue;
		}
		const result = item as {
			talkId?: unknown;
			transcriptSnippets?: unknown;
		};
		if (
			typeof result.talkId !== "string" ||
			!Array.isArray(result.transcriptSnippets)
		) {
			continue;
		}

		const snippets = result.transcriptSnippets.flatMap((snippet) => {
			if (!snippet || typeof snippet !== "object") {
				return [];
			}
			const value = snippet as {
				text?: unknown;
				cueIndex?: unknown;
				start?: unknown;
				startLabel?: unknown;
			};
			if (
				typeof value.text !== "string" ||
				typeof value.cueIndex !== "number" ||
				!Number.isFinite(value.cueIndex)
			) {
				return [];
			}

			return [
				{
					text: value.text,
					cueIndex: value.cueIndex,
					...(typeof value.start === "number" &&
						Number.isFinite(value.start) && { start: value.start }),
					...(typeof value.startLabel === "string" && {
						startLabel: value.startLabel,
					}),
				},
			];
		});
		if (snippets.length > 0) {
			snippetsByTalkId.set(result.talkId, snippets);
		}
	}

	return snippetsByTalkId;
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
					`/api/talk-search?query=${encodeURIComponent(normalizedSearchQuery)}`,
					{ signal: controller.signal },
				);
				if (!response.ok) {
					setServerSearchResult(null);
					return;
				}

				const data = (await response.json()) as ServerSearchResponse;
				setServerSearchResult({
					query: normalizedSearchQuery,
					talkIds: new Set(parseServerSearchTalkIds(data)),
					transcriptSnippetsByTalkId: parseServerSearchSnippets(data),
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

export function useTalkGalleryData(
	talks: TalkForDisplay[],
	viewMode: ViewMode,
	searchQuery: string,
) {
	const columns = useResponsiveColumns();

	const indexedTalks: IndexedTalk[] = useMemo(
		() => buildSearchIndex(talks),
		[talks],
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

		return talks.filter((talk) => serverSearchResult.talkIds.has(talk.id));
	}, [metadataFilteredTalks, searchTokens.length, serverSearchResult, talks]);
	const transcriptSnippetsByTalkId = useMemo(
		() =>
			serverSearchResult?.transcriptSnippetsByTalkId ??
			new Map<string, TranscriptSnippet[]>(),
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
