import type { TalkForDisplay } from "../../domain/talk/types";

export type IndexedTalk = {
	data: TalkForDisplay;
	searchText: string;
};

function normalizeForSearch(value: string): string {
	return value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function buildSearchText(talk: TalkForDisplay): string {
	return normalizeForSearch(
		[
			talk.dvdId,
			talk.title,
			talk.subtitle,
			talk.event,
			talk.venue,
			talk.speaker,
			talk.language,
			talk.recordedOnFormatted,
			talk.recordedOnRaw,
			talk.decadeLabel,
			talk.themeLabel,
			...talk.tags,
		]
			.filter(Boolean)
			.join(" "),
	);
}

function fuzzyMatch(source: string, query: string): boolean {
	if (!query) {
		return true;
	}

	return source.includes(query);
}

export function buildSearchIndex(talks: TalkForDisplay[]): IndexedTalk[] {
	return talks.map((talk) => ({
		data: talk,
		searchText: buildSearchText(talk),
	}));
}

export function tokenizeSearchQuery(query: string): string[] {
	if (!query) {
		return [];
	}

	const normalized = normalizeForSearch(query);
	if (!normalized) {
		return [];
	}

	return normalized.split(" ").filter(Boolean);
}

export function filterTalksByQuery(
	indexedTalks: IndexedTalk[],
	tokens: string[],
): TalkForDisplay[] {
	if (tokens.length === 0) {
		return indexedTalks.map((item) => item.data);
	}

	return indexedTalks
		.filter(({ searchText }) =>
			tokens.every((token) => fuzzyMatch(searchText, token)),
		)
		.map(({ data }) => data);
}
