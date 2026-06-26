import type { TalkGalleryItem } from "../../domain/talk/types";

export type GroupedSection = {
	label: string;
	count: number;
	sortKey: number;
	talks: TalkGalleryItem[];
};

export type TalkGalleryGroup = {
	section: GroupedSection;
	rows: TalkGalleryItem[][];
};

export type TalkGalleryVirtualRow = {
	rowIndex: number;
	talks: TalkGalleryItem[];
};

export type TalkGalleryVirtualData = {
	groups: TalkGalleryGroup[];
	groupCounts: number[];
	flatRows: TalkGalleryVirtualRow[];
};

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
	if (chunkSize <= 0) {
		return [items];
	}

	const chunks: T[][] = [];

	for (let i = 0; i < items.length; i += chunkSize) {
		chunks.push(items.slice(i, i + chunkSize));
	}

	return chunks;
}

export function buildDecadeSections(
	talks: TalkGalleryItem[],
): GroupedSection[] {
	const map = new Map<string, TalkGalleryItem[]>();

	talks.forEach((talk) => {
		const bucket = map.get(talk.decadeLabel);
		if (bucket) {
			bucket.push(talk);
		} else {
			map.set(talk.decadeLabel, [talk]);
		}
	});

	return Array.from(map.entries())
		.map(([decadeLabel, groupedTalks]) => {
			const getSortValue = (talk: TalkGalleryItem) =>
				talk.recordedOnSortValue > 0
					? talk.recordedOnSortValue
					: Number.POSITIVE_INFINITY;

			const sortedTalks = groupedTalks.slice().sort((a, b) => {
				if (decadeLabel === "最新") {
					return getSortValue(b) - getSortValue(a);
				}
				return getSortValue(a) - getSortValue(b);
			});

			const earliest = getSortValue(sortedTalks[0] as TalkGalleryItem);

			return {
				label: decadeLabel,
				talks: sortedTalks,
				count: groupedTalks.length,
				sortKey:
					decadeLabel === "最新"
						? Number.NEGATIVE_INFINITY
						: decadeLabel === "年代不明"
							? Number.POSITIVE_INFINITY
							: earliest,
			};
		})
		.sort((a, b) => a.sortKey - b.sortKey);
}

export function buildThemeSections(talks: TalkGalleryItem[]): GroupedSection[] {
	const map = new Map<string, TalkGalleryItem[]>();

	talks.forEach((talk) => {
		const key = talk.themeLabel;
		const bucket = map.get(key);
		if (bucket) {
			bucket.push(talk);
		} else {
			map.set(key, [talk]);
		}
	});

	return Array.from(map.entries())
		.map(([themeLabel, groupedTalks]) => {
			const priority = themeLabel === "テーマ未設定" ? 1 : 0;
			return {
				label: themeLabel,
				talks: groupedTalks
					.slice()
					.sort((a, b) => b.recordedOnSortValue - a.recordedOnSortValue),
				count: groupedTalks.length,
				sortKey: priority,
			};
		})
		.sort((a, b) => {
			if (a.sortKey !== b.sortKey) {
				return a.sortKey - b.sortKey;
			}
			return a.label.localeCompare(b.label, "ja");
		});
}

export function buildVirtualGalleryData(
	sections: GroupedSection[],
	columns: number,
): TalkGalleryVirtualData {
	const groups = sections.map((section) => ({
		section,
		rows: chunkArray(section.talks, columns).filter((row) => row.length > 0),
	}));

	const groupCounts: number[] = [];
	const flatRows: TalkGalleryVirtualRow[] = [];

	groups.forEach((group) => {
		groupCounts.push(group.rows.length);
		group.rows.forEach((talksInRow, rowIndex) => {
			flatRows.push({
				rowIndex,
				talks: talksInRow,
			});
		});
	});

	return { groups, groupCounts, flatRows };
}
