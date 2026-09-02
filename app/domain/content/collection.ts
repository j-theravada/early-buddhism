import type {
	ContentCollectionId,
	ContentItemBase,
	ContentSeriesId,
} from "./types";

export type ContentClassification = Pick<
	ContentItemBase,
	"collectionId" | "collectionLabel" | "seriesId" | "seriesLabel"
>;

type ContentClassificationSources = {
	collectionSources?: readonly string[];
	seriesSources?: readonly string[];
};

const DEFAULT_CLASSIFICATION: ContentClassification = {
	collectionId: "other",
	collectionLabel: "法話",
	seriesId: "",
	seriesLabel: "",
};

const CONTENT_COLLECTION_IDS: readonly ContentCollectionId[] = [
	"monthly_talk",
	"scripture_commentary",
	"other",
];

const KNOWN_CONTENT_SERIES: readonly {
	id: ContentSeriesId;
	label: string;
	aliases: readonly string[];
}[] = [
	{
		id: "dhammapada",
		label: "ダンマパダ",
		aliases: ["dhammapada", "ダンマパダ", "法句経"],
	},
	{
		id: "abhidhamma",
		label: "アビダンマ",
		aliases: ["abhidhamma", "abhidharma", "アビダンマ"],
	},
	{
		id: "sutta_nipata",
		label: "スッタニパータ",
		aliases: ["sutta_nipata", "sutta nipata", "suttanipata", "スッタニパータ"],
	},
];

const PLACEHOLDER_CLASSIFICATION_SOURCES = new Set([
	"",
	"-",
	"ー",
	"―",
	"—",
	"なし",
	"無し",
	"n/a",
	"none",
]);

const NON_SERIES_LABEL_SOURCES = new Set(["法話", "その他"]);

export function parseContentCollectionId(
	value: string,
): ContentCollectionId | "" {
	return isContentCollectionId(value) ? value : "";
}

function isContentCollectionId(value: string): value is ContentCollectionId {
	return CONTENT_COLLECTION_IDS.some((collectionId) => collectionId === value);
}

export function parseContentSeriesId(value: string): ContentSeriesId | "" {
	const normalized = normalizeClassificationSource(value);
	if (isPlaceholderClassificationSource(normalized)) {
		return "";
	}

	const knownSeries = resolveKnownSeriesFromSource(normalized);
	if (knownSeries) {
		return knownSeries.seriesId;
	}

	return resolveCollectionIdFromSource(normalized) ? "" : normalized;
}

function normalizeClassificationSource(value: string): string {
	return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function cleanClassificationLabel(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

function isPlaceholderClassificationSource(value: string): boolean {
	return PLACEHOLDER_CLASSIFICATION_SOURCES.has(
		normalizeClassificationSource(value).toLowerCase(),
	);
}

function resolveCollectionIdFromSource(
	value: string,
): ContentCollectionId | null {
	const normalized = normalizeClassificationSource(value).toLowerCase();
	if (!normalized) {
		return null;
	}
	if (normalized.includes("月例講演会")) {
		return "monthly_talk";
	}
	if (
		normalized.includes("経典解説") ||
		normalized.includes("経典講義") ||
		normalized.includes("scripture commentary")
	) {
		return "scripture_commentary";
	}
	return null;
}

function getCollectionLabel(collectionId: ContentCollectionId): string {
	switch (collectionId) {
		case "monthly_talk":
			return "月例講演会";
		case "scripture_commentary":
			return "経典解説";
		case "other":
			return DEFAULT_CLASSIFICATION.collectionLabel;
	}
}

function resolveKnownSeriesFromSource(
	value: string,
): Pick<ContentClassification, "seriesId" | "seriesLabel"> | null {
	const normalized = normalizeClassificationSource(value);
	const normalizedLower = normalized.toLowerCase();
	if (!normalizedLower) {
		return null;
	}

	const knownSeries = KNOWN_CONTENT_SERIES.find((series) =>
		series.aliases.some((alias) =>
			normalizedLower.includes(
				normalizeClassificationSource(alias).toLowerCase(),
			),
		),
	);
	if (!knownSeries) {
		return null;
	}

	return {
		seriesId: knownSeries.id,
		seriesLabel: knownSeries.label,
	};
}

function isDynamicSeriesSource(value: string): boolean {
	const normalized = normalizeClassificationSource(value);
	const normalizedLower = normalized.toLowerCase();
	if (!normalized) {
		return false;
	}
	if (
		isPlaceholderClassificationSource(normalized) ||
		NON_SERIES_LABEL_SOURCES.has(normalized) ||
		resolveCollectionIdFromSource(normalized)
	) {
		return false;
	}

	return normalizedLower !== "other";
}

function resolveSeriesFromSource(
	value: string,
	{ allowDynamic }: { allowDynamic: boolean },
): Pick<ContentClassification, "seriesId" | "seriesLabel"> | null {
	const knownSeries = resolveKnownSeriesFromSource(value);
	if (knownSeries) {
		return knownSeries;
	}

	const normalized = normalizeClassificationSource(value);
	if (!allowDynamic || !isDynamicSeriesSource(normalized)) {
		return null;
	}

	return {
		seriesId: normalized,
		seriesLabel: cleanClassificationLabel(value),
	};
}

function findKnownCollectionId(
	sources: readonly string[],
): ContentCollectionId | null {
	for (const source of sources) {
		const collectionId = resolveCollectionIdFromSource(source);
		if (collectionId) {
			return collectionId;
		}
	}
	return null;
}

function findSeries(
	sources: readonly string[],
	{ allowDynamic }: { allowDynamic: boolean },
): Pick<ContentClassification, "seriesId" | "seriesLabel"> | null {
	for (const source of sources) {
		const series = resolveSeriesFromSource(source, { allowDynamic });
		if (series) {
			return series;
		}
	}
	return null;
}

export function resolveContentClassification({
	collectionSources = [],
	seriesSources = [],
}: ContentClassificationSources): ContentClassification {
	const series =
		findSeries(seriesSources, { allowDynamic: true }) ??
		findSeries(collectionSources, { allowDynamic: false }) ??
		null;
	const knownCollectionId = findKnownCollectionId(collectionSources);
	const collectionId = series
		? "scripture_commentary"
		: (knownCollectionId ?? "other");
	const fallbackCollectionLabel = collectionSources
		.map(cleanClassificationLabel)
		.find((source) => !isPlaceholderClassificationSource(source));

	return {
		collectionId,
		collectionLabel:
			collectionId === "other"
				? fallbackCollectionLabel || DEFAULT_CLASSIFICATION.collectionLabel
				: getCollectionLabel(collectionId),
		seriesId: series?.seriesId ?? "",
		seriesLabel: series?.seriesLabel ?? "",
	};
}

export function resolveContentCollection(
	sources: readonly string[],
): Pick<ContentItemBase, "collectionId" | "collectionLabel"> {
	const { collectionId, collectionLabel } = resolveContentClassification({
		collectionSources: sources,
	});
	return { collectionId, collectionLabel };
}
