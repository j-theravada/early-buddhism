import {
	parseContentCollectionId,
	parseContentSeriesId,
} from "../../domain/content/collection";
import type {
	ContentCollectionId,
	ContentSeriesId,
} from "../../domain/content/types";
import type { TalkGalleryItem } from "../../domain/talk/types";
import {
	normalizeSearchFields,
	type SearchField,
	type TranscriptSearchSnippet,
} from "./search";

export const TALK_LISTING_PAGE_SIZE = 30;
export const TALK_LISTING_MAX_QUERY_LENGTH = 120;

export type TalkListingRequest = {
	page: string;
	query?: string;
	collectionId?: string;
	seriesId?: string;
	searchFields?: string[];
};

export type TalkListingConditions = {
	query: string;
	collectionId: ContentCollectionId | "";
	seriesId: ContentSeriesId | "";
	searchFields: SearchField[];
};

export type TalkListingOption<TId extends string> = {
	id: TId;
	label: string;
};

export type TalkListingSeriesOption = TalkListingOption<ContentSeriesId> & {
	collectionId: ContentCollectionId;
};

export type TalkListingDecadeTarget = {
	label: string;
	count: number;
	page: number;
	anchorId: string;
};

export type TalkListingSection = {
	label: string;
	anchorId: string;
	items: TalkGalleryItem[];
};

export type TalkListingPage = {
	conditions: TalkListingConditions;
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
	rangeStart: number;
	rangeEnd: number;
	previousPage: number | null;
	nextPage: number | null;
	items: TalkGalleryItem[];
	transcriptSnippetsByTalkId: ReadonlyMap<string, TranscriptSearchSnippet[]>;
	collectionOptions: TalkListingOption<ContentCollectionId>[];
	seriesOptions: TalkListingSeriesOption[];
	decadeTargets: TalkListingDecadeTarget[];
};

export type NormalizedTalkListingRequest = {
	page: number;
	conditions: TalkListingConditions;
	collectionOptions: TalkListingOption<ContentCollectionId>[];
	seriesOptions: TalkListingSeriesOption[];
};

export function parseTalkListingPageNumber(value: string): number | null {
	if (!/^[1-9]\d*$/.test(value)) return null;
	const page = Number(value);
	return Number.isSafeInteger(page) ? page : null;
}

function buildListingOptions(items: readonly TalkGalleryItem[]) {
	const collectionById = new Map<
		ContentCollectionId,
		TalkListingOption<ContentCollectionId>
	>();
	const seriesById = new Map<ContentSeriesId, TalkListingSeriesOption>();
	for (const item of items) {
		if (!collectionById.has(item.collectionId)) {
			collectionById.set(item.collectionId, {
				id: item.collectionId,
				label: item.collectionLabel,
			});
		}
		if (item.seriesId && !seriesById.has(item.seriesId)) {
			seriesById.set(item.seriesId, {
				id: item.seriesId,
				label: item.seriesLabel,
				collectionId: item.collectionId,
			});
		}
	}
	return {
		collectionOptions: [...collectionById.values()],
		seriesOptions: [...seriesById.values()],
	};
}

function normalizeListingClassification(
	request: TalkListingRequest,
	collectionOptions: TalkListingOption<ContentCollectionId>[],
	seriesOptions: TalkListingSeriesOption[],
): Pick<TalkListingConditions, "collectionId" | "seriesId"> | null {
	const rawCollectionId = request.collectionId?.trim() ?? "";
	const rawSeriesId = request.seriesId?.trim() ?? "";
	const parsedCollectionId = rawCollectionId
		? parseContentCollectionId(rawCollectionId)
		: "";
	if (
		rawCollectionId &&
		(!parsedCollectionId ||
			!collectionOptions.some(({ id }) => id === parsedCollectionId))
	) {
		return null;
	}

	const parsedSeriesId = rawSeriesId ? parseContentSeriesId(rawSeriesId) : "";
	const seriesOption = parsedSeriesId
		? seriesOptions.find(({ id }) => id === parsedSeriesId)
		: undefined;
	if (rawSeriesId && !seriesOption) return null;
	if (
		parsedCollectionId &&
		seriesOption &&
		parsedCollectionId !== seriesOption.collectionId
	) {
		return null;
	}

	return {
		collectionId: parsedCollectionId || seriesOption?.collectionId || "",
		seriesId: seriesOption?.id ?? "",
	};
}

export function normalizeTalkListingRequest(
	items: readonly TalkGalleryItem[],
	request: TalkListingRequest,
): NormalizedTalkListingRequest | null {
	const page = parseTalkListingPageNumber(request.page);
	if (!page) return null;

	const { collectionOptions, seriesOptions } = buildListingOptions(items);
	const classification = normalizeListingClassification(
		request,
		collectionOptions,
		seriesOptions,
	);
	if (!classification) return null;

	return {
		page,
		conditions: {
			query: (request.query ?? "")
				.trim()
				.slice(0, TALK_LISTING_MAX_QUERY_LENGTH),
			...classification,
			searchFields: normalizeSearchFields(request.searchFields),
		},
		collectionOptions,
		seriesOptions,
	};
}

export function buildTalkDecadeAnchorId(label: string): string {
	const year = label.match(/\d{4}/)?.[0];
	if (year) return `talk-decade-${year}`;
	if (label === "最新") return "talk-decade-latest";
	return "talk-decade-unknown";
}

export function buildTalkListingSections(
	items: readonly TalkGalleryItem[],
): TalkListingSection[] {
	const sections: TalkListingSection[] = [];
	for (const item of items) {
		const current = sections.at(-1);
		if (current?.label === item.decadeLabel) {
			current.items.push(item);
			continue;
		}
		sections.push({
			label: item.decadeLabel,
			anchorId: buildTalkDecadeAnchorId(item.decadeLabel),
			items: [item],
		});
	}
	return sections;
}

function buildDecadeTargets(
	items: readonly TalkGalleryItem[],
): TalkListingDecadeTarget[] {
	const byLabel = new Map<string, { count: number; firstIndex: number }>();
	items.forEach((item, index) => {
		const existing = byLabel.get(item.decadeLabel);
		if (existing) {
			existing.count += 1;
		} else {
			byLabel.set(item.decadeLabel, { count: 1, firstIndex: index });
		}
	});
	return [...byLabel.entries()].map(([label, value]) => ({
		label,
		count: value.count,
		page: Math.floor(value.firstIndex / TALK_LISTING_PAGE_SIZE) + 1,
		anchorId: buildTalkDecadeAnchorId(label),
	}));
}

export function buildTalkListingPage(
	allItems: readonly TalkGalleryItem[],
	normalized: NormalizedTalkListingRequest,
	matchedTalkIds: readonly string[] = [],
	transcriptSnippetsByTalkId: ReadonlyMap<
		string,
		TranscriptSearchSnippet[]
	> = new Map(),
): TalkListingPage | null {
	const { conditions, page } = normalized;
	const matchingIdSet = conditions.query ? new Set(matchedTalkIds) : null;
	const filteredItems = allItems.filter(
		(item) =>
			(!matchingIdSet || matchingIdSet.has(item.id)) &&
			(!conditions.collectionId ||
				item.collectionId === conditions.collectionId) &&
			(!conditions.seriesId || item.seriesId === conditions.seriesId),
	);
	const totalItems = filteredItems.length;
	const totalPages = Math.max(
		1,
		Math.ceil(totalItems / TALK_LISTING_PAGE_SIZE),
	);
	if (page > totalPages) return null;

	const start = (page - 1) * TALK_LISTING_PAGE_SIZE;
	const items = filteredItems.slice(start, start + TALK_LISTING_PAGE_SIZE);
	const visibleIds = new Set(items.map((item) => item.id));
	const visibleSnippets = new Map(
		[...transcriptSnippetsByTalkId].filter(([talkId]) =>
			visibleIds.has(talkId),
		),
	);

	return {
		conditions,
		page,
		pageSize: TALK_LISTING_PAGE_SIZE,
		totalItems,
		totalPages,
		rangeStart: totalItems === 0 ? 0 : start + 1,
		rangeEnd: totalItems === 0 ? 0 : start + items.length,
		previousPage: page > 1 ? page - 1 : null,
		nextPage: page < totalPages ? page + 1 : null,
		items,
		transcriptSnippetsByTalkId: visibleSnippets,
		collectionOptions: normalized.collectionOptions,
		seriesOptions: normalized.seriesOptions,
		decadeTargets: buildDecadeTargets(filteredItems),
	};
}
