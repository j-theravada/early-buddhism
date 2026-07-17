# Server-Paginated Talk Listing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the six-item preview, deferred 901-item client gallery, and separate static archive with one server-rendered, searchable, 30-item paginated talk listing.

**Architecture:** Pure application functions validate URL state, preserve newest-first order, filter before pagination, and split transcript matching from page-only snippet generation. A dependency-injected reader owns the five-minute ID cache and lazily binds the 86 MB transcript read model only when `query` is active. Shared Server Components render the root and numbered routes, while normal links carry filters and detail-return state without Virtuoso or client gallery APIs.

**Tech Stack:** Next.js 16 App Router, React 19 Server Components, TypeScript 5.9, Bun test, oxfmt, oxlint, Vercel.

## Global Constraints

- Render exactly 30 talks per normal page; `/talks` is page 1 and `/talks/page/N` is page N for N greater than 1.
- Keep newest-first order from `buildTalkGalleryItems()`; never pass paged items through the current `buildDecadeSections()` because it reorders older decades.
- Keep GET parameter names `query`, `collection`, and `series`, with query trimmed and capped at 120 characters.
- Search, collection, and series filtering happen over the full matching set before slicing the requested page.
- Valid page-1 searches with zero matches return 200 and an empty result; malformed pages, unknown filters, contradictory series parents, and out-of-range pages return 404.
- A request with no effective query must never load or parse `app/generated/transcript-search-documents.json`.
- Search cache entries contain ordered matching IDs only, expire after five minutes, and are bounded to 100 entries.
- Generate transcript snippets for current-page talk IDs only.
- Preserve transcript cue links, filter links, decade links, and detail-page return state as ordinary hrefs.
- Filtered/search URLs are `noindex, follow` and absent from the sitemap; unfiltered paginated URLs are self-canonical.
- Keep the transcript detail experience and the homepage `TalkGalleryCard` appearance unchanged.
- Use red-green-refactor for every production behavior change.
- Use `/Users/tt/.bun/bin/bun` and `/Users/tt/.bun/bin/bunx` explicitly because Bun is not on the non-interactive shell `PATH`.
- Do not edit generated talk, transcript, or search-document data in this implementation.
- Execute feature work in a worktree created with `superpowers:using-git-worktrees`.

---

## File Map

### Create

- `app/application/talk/listing.ts` — URL validation, classification validation, filtering, pagination, ranges, decade targets, and adjacent section grouping.
- `app/application/talk/listing.test.ts` — 901-item pagination, invalid URL, filter, series-parent, zero-result, order, and decade contracts.
- `app/application/talk/listing-reader.ts` — dependency-injected lazy search orchestration and bounded ID cache.
- `app/application/talk/listing-reader.test.ts` — no-query lazy behavior, page-only snippets, normalized cache keys, TTL, capacity, and error propagation.
- `app/infrastructure/talk/listing-reader.ts` — production binding to talks and transcript search documents.
- `app/components/talk-listing.tsx` — complete server-rendered controls, result range, sections, cards, and empty state.
- `app/components/talk-listing-pagination.tsx` — compact first/current/last page navigation.
- `app/components/talk-listing.test.tsx` — no-JavaScript GET form and href graph.
- `app/components/talk-gallery/talk-gallery-card.test.tsx` — filter/detail/cue links plus homepage badge compatibility.
- `app/talks/talk-listing-page.tsx` — shared route renderer, search-param mapping, and metadata helper.
- `app/talks/page/[page]/page.tsx` — numbered listing route.
- `app/talks/page/[page]/page.test.tsx` — numbered route rendering, metadata, params, and 404 behavior.
- `app/application/talk/archive-redirect.ts` — legacy 100-item archive page to 30-item listing-page mapping.
- `app/application/talk/archive-redirect.test.ts` — complete 1–10 legacy mapping table.
- `next.config.test.ts` — page-1 redirect and both route-trace declarations.

### Modify

- `app/application/talk/transcript-search.ts` and test — split ordered match IDs from snippets.
- `app/application/talk/links.ts` and test — page-aware option objects and strict `galleryPage` parsing.
- `app/components/talk-gallery/talk-gallery-card.tsx` — opt-in normal filter links and page-aware detail links.
- `app/components/talk-gallery/decade-jump-nav.tsx` — replace client buttons with server-rendered links.
- `app/components/talk-gallery/talk-gallery-section-header.tsx` — accept adjacent server section data and anchor IDs.
- `app/talks/page.tsx` and test — replace preview/loader/archive UI with shared listing route.
- `app/talks/[id]/page.tsx` and test — restore query, classification, and numbered page.
- `app/talks/archive/[page]/page.tsx` and test — render no UI; return strict permanent redirects.
- `app/sitemap.ts` and test — list `/talks` plus pages 2–31 and remove archive URLs.
- `app/application/navigation/scroll-restoration.ts` and test — remove the Virtuoso-only detail-to-gallery exception.
- `app/infrastructure/browser/storage.ts` and test — remove only Virtuoso snapshot types/helpers.
- `next.config.ts` — add the permanent page-1 redirect and move search-document traces to both listing routes.
- `package.json` and `bun.lock` — remove `react-virtuoso`.

### Delete after the SSR replacement passes

- `app/api/talk-gallery/route.ts`
- `app/api/talk-search/route.ts`
- `app/components/talk-gallery-loader.tsx`
- `app/components/deferred-talk-gallery.tsx`
- `app/components/talk-gallery.tsx`
- `app/components/talk-gallery/talk-gallery-row.tsx`
- `app/components/talk-gallery/use-talk-gallery-data.ts`
- `app/infrastructure/browser/talk-gallery-storage.ts`
- `app/application/talk/archive.ts`
- `app/application/talk/archive.test.ts`
- `app/application/talk/grouping.ts`
- `app/application/talk/grouping.test.ts`

Keep `app/application/talk/search-api.ts` because the preserved SQLite/Turso search module still consumes its response types. The new card imports `TranscriptSearchSnippet` from `app/application/talk/search.ts`, not from the deleted hook.

---

### Task 1: Split transcript matching from page-only snippet generation

**Files:**

- Modify: `app/application/talk/transcript-search.ts`
- Modify: `app/application/talk/transcript-search.test.ts`

**Interfaces:**

- Produces: `findTranscriptAwareTalkIds(data: TranscriptAwareSearchData, query: string): string[]`
- Produces: `buildTranscriptSnippetsByTalkId(data: TranscriptAwareSearchData, query: string, talkIds: readonly string[]): Map<string, TranscriptSearchSnippet[]>`
- Keeps: `searchTranscriptAwareTalks()` as a compatibility wrapper until the API route is removed.

- [ ] **Step 1: Write failing split-search tests**

Add imports for the two new functions and append these tests inside the existing describe block:

```ts
test("一致IDを新しい順のまま返す", () => {
	const searchData = buildTranscriptAwareSearchData(
		[
			createTalk({
				id: "TALK-NEW",
				title: "慈悲の話",
				recordedOnDate: new Date("2024-01-01T00:00:00.000Z"),
			}),
			createTalk({
				id: "TALK-OLD",
				title: "慈悲の実践",
				recordedOnDate: new Date("2020-01-01T00:00:00.000Z"),
			}),
		],
		[],
	);

	expect(findTranscriptAwareTalkIds(searchData, "慈悲")).toEqual([
		"TALK-NEW",
		"TALK-OLD",
	]);
});

test("指定された表示IDだけの文字起こしスニペットを作る", () => {
	const talks = [
		createTalk({ id: "TALK-1", title: "第一講" }),
		createTalk({ id: "TALK-2", title: "第二講" }),
	];
	const cues = (text: string) => [
		{
			index: 3,
			start: 12,
			end: 18,
			startLabel: "00:00:12",
			endLabel: "00:00:18",
			text,
		},
	];
	const searchData = buildTranscriptAwareSearchData(talks, [
		{ talkId: "TALK-1", text: "慈悲", cues: cues("第一講の慈悲") },
		{ talkId: "TALK-2", text: "慈悲", cues: cues("第二講の慈悲") },
	]);

	const snippets = buildTranscriptSnippetsByTalkId(searchData, "慈悲", [
		"TALK-2",
	]);

	expect([...snippets.keys()]).toEqual(["TALK-2"]);
	expect(snippets.get("TALK-2")?.[0]?.text).toBe("第二講の慈悲");
});

test("メタデータだけの一致には文字起こしスニペットを作らない", () => {
	const searchData = buildTranscriptAwareSearchData(
		[createTalk({ id: "TALK-META", title: "慈悲の講演" })],
		[],
	);

	expect(findTranscriptAwareTalkIds(searchData, "慈悲")).toEqual(["TALK-META"]);
	expect(
		buildTranscriptSnippetsByTalkId(searchData, "慈悲", ["TALK-META"]),
	).toEqual(new Map());
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
set -euo pipefail
/Users/tt/.bun/bin/bun test app/application/talk/transcript-search.test.ts
```

Expected: FAIL because the two new exports do not exist.

- [ ] **Step 3: Add the two focused functions and compose the compatibility wrapper**

Add `TranscriptSearchSnippet` to the import from `./search`, export the filtered-ID function, and add the page-ID snippet function:

```ts
export function findTranscriptAwareTalkIds(
	searchData: TranscriptAwareSearchData,
	query: string,
): string[] {
	const tokens = tokenizeSearchQuery(query);
	if (tokens.length === 0) return [];

	return filterTranscriptAwareTalks(searchData, tokens).map((talk) => talk.id);
}

export function buildTranscriptSnippetsByTalkId(
	searchData: TranscriptAwareSearchData,
	query: string,
	talkIds: readonly string[],
): Map<string, TranscriptSearchSnippet[]> {
	const tokens = tokenizeSearchQuery(query);
	const snippetsByTalkId = new Map<string, TranscriptSearchSnippet[]>();
	if (tokens.length === 0) return snippetsByTalkId;

	for (const talkId of talkIds) {
		if (!hasTranscriptTokenMatch(searchData, talkId, tokens)) continue;
		const snippets = buildTranscriptSearchSnippets(
			searchData.transcriptDocumentByTalkId.get(talkId)?.cues ?? [],
			tokens,
		);
		if (snippets.length > 0) {
			snippetsByTalkId.set(talkId, snippets);
		}
	}

	return snippetsByTalkId;
}
```

Replace the body of `searchTranscriptAwareTalks()` with:

```ts
const talkIds = findTranscriptAwareTalkIds(searchData, query);
if (talkIds.length === 0) {
	return buildEmptyTalkSearchApiResponse();
}
const snippetsByTalkId = buildTranscriptSnippetsByTalkId(
	searchData,
	query,
	talkIds,
);
return {
	talkIds,
	results: talkIds.flatMap((talkId) => {
		const transcriptSnippets = snippetsByTalkId.get(talkId);
		return transcriptSnippets ? [{ talkId, transcriptSnippets }] : [];
	}),
};
```

- [ ] **Step 4: Run the test and verify GREEN**

Run the Step 2 command again.

Expected: all transcript-aware search tests PASS, including the existing API-shape assertions.

- [ ] **Step 5: Format and commit Task 1**

```bash
set -euo pipefail
/Users/tt/.bun/bin/bunx oxfmt app/application/talk/transcript-search.ts app/application/talk/transcript-search.test.ts
git diff --check
git add app/application/talk/transcript-search.ts app/application/talk/transcript-search.test.ts
git commit -m "refactor: split talk search matching from snippets"
```

---

### Task 2: Add strict filtering, pagination, ranges, and decade models

**Files:**

- Create: `app/application/talk/listing.ts`
- Create: `app/application/talk/listing.test.ts`

**Interfaces:**

- Produces: `TALK_LISTING_PAGE_SIZE = 30`
- Produces: `TALK_LISTING_MAX_QUERY_LENGTH = 120`
- Produces: `TalkListingRequest`, `TalkListingConditions`, `TalkListingPage`, `TalkListingDecadeTarget`, and `TalkListingSection`
- Produces: `normalizeTalkListingRequest(items, request)`
- Produces: `buildTalkListingPage(items, normalized, matchedTalkIds?, snippets?)`
- Produces: `buildTalkDecadeAnchorId(label)` and `buildTalkListingSections(items)`

- [ ] **Step 1: Write the failing listing-model tests**

Create a complete `TalkGalleryItem` fixture helper and cover the following exact cases:

```ts
import { describe, expect, test } from "bun:test";
import type { TalkGalleryItem } from "../../domain/talk/types";
import {
	buildTalkListingPage,
	buildTalkListingSections,
	normalizeTalkListingRequest,
	TALK_LISTING_PAGE_SIZE,
} from "./listing";

function createItem(index: number, overrides: Partial<TalkGalleryItem> = {}) {
	return {
		id: `TALK-${String(index).padStart(3, "0")}`,
		dvdId: `V-${index}`,
		collectionId: "monthly_talk" as const,
		collectionLabel: "月例講演会",
		seriesId: "",
		seriesLabel: "",
		title: `法話 ${index}`,
		subtitle: "",
		attachmentsLink: null,
		youtubeUrl: null,
		thumbnailUrl: null,
		recordedOnFormatted: "2024年1月1日",
		recordedOnSortValue: 2_000_000 - index,
		decadeLabel: "2020年代",
		themeLabel: "",
		...overrides,
	} satisfies TalkGalleryItem;
}

describe("talk listing model", () => {
	test("901件を新しい順のまま30件ずつ31ページへ分ける", () => {
		const items = Array.from({ length: 901 }, (_, index) =>
			createItem(index + 1),
		);
		const ids: string[] = [];
		for (let page = 1; page <= 31; page += 1) {
			const normalized = normalizeTalkListingRequest(items, {
				page: String(page),
			});
			expect(normalized).not.toBeNull();
			const result = buildTalkListingPage(items, normalized!);
			expect(result).not.toBeNull();
			ids.push(...result!.items.map((item) => item.id));
			expect(result!.items).toHaveLength(page === 31 ? 1 : 30);
		}
		expect(ids).toEqual(items.map((item) => item.id));
		expect(TALK_LISTING_PAGE_SIZE).toBe(30);
	});

	test("非正規ページ表記と範囲外を拒否する", () => {
		const items = Array.from({ length: 31 }, (_, index) =>
			createItem(index + 1),
		);
		for (const page of ["0", "-1", "02", "2.0", "1e1", "x"]) {
			expect(normalizeTalkListingRequest(items, { page })).toBeNull();
		}
		const normalized = normalizeTalkListingRequest(items, { page: "3" });
		expect(buildTalkListingPage(items, normalized!)).toBeNull();
	});

	test("分類と検索IDを全件へ適用してからページングする", () => {
		const items = Array.from({ length: 70 }, (_, index) =>
			createItem(index + 1, {
				collectionId: index < 35 ? "monthly_talk" : "other",
				collectionLabel: index < 35 ? "月例講演会" : "法話",
			}),
		);
		const normalized = normalizeTalkListingRequest(items, {
			page: "2",
			query: "慈悲",
			collectionId: "monthly_talk",
		});
		const matched = items.slice(0, 35).map((item) => item.id);
		const result = buildTalkListingPage(items, normalized!, matched);

		expect(result?.totalItems).toBe(35);
		expect(result?.items).toHaveLength(5);
		expect(result?.rangeStart).toBe(31);
		expect(result?.rangeEnd).toBe(35);
	});

	test("未知seriesと親collectionの矛盾を拒否しseries単独は親を補う", () => {
		const items = [
			createItem(1, {
				collectionId: "scripture_commentary",
				collectionLabel: "経典解説",
				seriesId: "abhidhamma",
				seriesLabel: "アビダンマ",
			}),
		];
		expect(
			normalizeTalkListingRequest(items, {
				page: "1",
				seriesId: "unknown-series",
			}),
		).toBeNull();
		expect(
			normalizeTalkListingRequest(items, {
				page: "1",
				collectionId: "monthly_talk",
				seriesId: "abhidhamma",
			}),
		).toBeNull();
		expect(
			normalizeTalkListingRequest(items, {
				page: "1",
				seriesId: "abhidhamma",
			})?.conditions,
		).toMatchObject({
			collectionId: "scripture_commentary",
			seriesId: "abhidhamma",
		});
	});

	test("正常な0件検索はpage 1の成功結果にする", () => {
		const items = [createItem(1)];
		const normalized = normalizeTalkListingRequest(items, {
			page: "1",
			query: "一致なし",
		});
		const result = buildTalkListingPage(items, normalized!, []);
		expect(result).toMatchObject({
			totalItems: 0,
			totalPages: 1,
			rangeStart: 0,
			rangeEnd: 0,
			items: [],
		});
	});

	test("queryをtrimして120文字に制限する", () => {
		const normalized = normalizeTalkListingRequest([createItem(1)], {
			page: "1",
			query: `  ${"慈".repeat(121)}  `,
		});
		expect(normalized?.conditions.query).toBe("慈".repeat(120));
	});

	test("年代リンクとページ内セクションは入力順を変えない", () => {
		const items = [
			...Array.from({ length: 31 }, (_, index) => createItem(index + 1)),
			createItem(32, {
				decadeLabel: "2010年代",
				recordedOnSortValue: 1,
			}),
		];
		const normalized = normalizeTalkListingRequest(items, { page: "2" });
		const result = buildTalkListingPage(items, normalized!);
		expect(result?.decadeTargets).toEqual([
			{
				label: "2020年代",
				count: 31,
				page: 1,
				anchorId: "talk-decade-2020",
			},
			{
				label: "2010年代",
				count: 1,
				page: 2,
				anchorId: "talk-decade-2010",
			},
		]);
		expect(
			buildTalkListingSections(result!.items).flatMap((section) =>
				section.items.map((item) => item.id),
			),
		).toEqual(result?.items.map((item) => item.id));
	});
});
```

- [ ] **Step 2: Run the new test and verify RED**

```bash
set -euo pipefail
/Users/tt/.bun/bin/bun test app/application/talk/listing.test.ts
```

Expected: FAIL because `listing.ts` does not exist.

- [ ] **Step 3: Create the listing model with the exact public contract**

Create `app/application/talk/listing.ts` with these exported values and types:

```ts
export const TALK_LISTING_PAGE_SIZE = 30;
export const TALK_LISTING_MAX_QUERY_LENGTH = 120;

export type TalkListingRequest = {
	page: string;
	query?: string;
	collectionId?: string;
	seriesId?: string;
};
export type TalkListingConditions = {
	query: string;
	collectionId: ContentCollectionId | "";
	seriesId: ContentSeriesId | "";
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
```

Implement strict page parsing and option collection as follows:

```ts
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

export function normalizeTalkListingRequest(
	items: readonly TalkGalleryItem[],
	request: TalkListingRequest,
): NormalizedTalkListingRequest | null {
	const page = parseTalkListingPageNumber(request.page);
	if (!page) return null;

	const { collectionOptions, seriesOptions } = buildListingOptions(items);
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
		page,
		conditions: {
			query: (request.query ?? "")
				.trim()
				.slice(0, TALK_LISTING_MAX_QUERY_LENGTH),
			collectionId: parsedCollectionId || seriesOption?.collectionId || "",
			seriesId: seriesOption?.id ?? "",
		},
		collectionOptions,
		seriesOptions,
	};
}
```

Implement the two order-sensitive helpers exactly as adjacent/first-occurrence operations:

```ts
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
```

Add the first-occurrence decade target and page builder:

```ts
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
	const hasConditions = Boolean(
		conditions.query || conditions.collectionId || conditions.seriesId,
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
		decadeTargets: hasConditions ? [] : buildDecadeTargets(allItems),
	};
}
```

- [ ] **Step 4: Run the listing tests and verify GREEN**

Run the Step 2 command.

Expected: all listing-model tests PASS and the flattened 31 pages exactly equal the source order.

- [ ] **Step 5: Format and commit Task 2**

```bash
set -euo pipefail
/Users/tt/.bun/bin/bunx oxfmt app/application/talk/listing.ts app/application/talk/listing.test.ts
git diff --check
git add app/application/talk/listing.ts app/application/talk/listing.test.ts
git commit -m "feat: add server talk listing pagination"
```

---

### Task 3: Add lazy search orchestration and an ID-only cache

**Files:**

- Create: `app/application/talk/listing-reader.ts`
- Create: `app/application/talk/listing-reader.test.ts`
- Create: `app/infrastructure/talk/listing-reader.ts`

**Interfaces:**

- Produces: `createTalkListingReader(dependencies, options?)`
- Produces: `readTalkListingPage(request): Promise<TalkListingPage | null>`
- Consumes the Task 1 match/snippet functions and Task 2 model.

- [ ] **Step 1: Write failing lazy-loading and cache tests**

Use fake dependencies with counters and a mutable clock. Define these local fixtures before the tests:

```ts
function createItems(count: number): TalkGalleryItem[] {
	return Array.from({ length: count }, (_, index) => ({
		id: `TALK-${index + 1}`,
		dvdId: `V-${index + 1}`,
		collectionId: "monthly_talk",
		collectionLabel: "月例講演会",
		seriesId: "",
		seriesLabel: "",
		title: `法話 ${index + 1}`,
		subtitle: "",
		attachmentsLink: null,
		youtubeUrl: null,
		thumbnailUrl: null,
		recordedOnFormatted: "2024年1月1日",
		recordedOnSortValue: count - index,
		decadeLabel: "2020年代",
		themeLabel: "",
	}));
}

function createSnippet(text: string): TranscriptSearchSnippet {
	return {
		text,
		cueIndex: 1,
		start: 10,
		startLabel: "00:00:10",
	};
}
```

Then cover all assertions below:

```ts
test("queryなしでは検索依存を呼ばない", async () => {
	let matchCalls = 0;
	let snippetCalls = 0;
	const reader = createTalkListingReader({
		loadItems: async () => createItems(61),
		findMatchingTalkIds: async () => {
			matchCalls += 1;
			return [];
		},
		buildTranscriptSnippets: async () => {
			snippetCalls += 1;
			return new Map();
		},
	});

	const result = await reader({ page: "1", query: "   " });
	expect(result?.items).toHaveLength(30);
	expect(matchCalls).toBe(0);
	expect(snippetCalls).toBe(0);
});

test("一致IDは全件で求めて現在ページIDだけのsnippetを要求する", async () => {
	const items = createItems(61);
	const snippetInputs: string[][] = [];
	const reader = createTalkListingReader({
		loadItems: async () => items,
		findMatchingTalkIds: async () => items.map((item) => item.id),
		buildTranscriptSnippets: async (_query, talkIds) => {
			snippetInputs.push([...talkIds]);
			return new Map([
				[talkIds[0]!, [createSnippet("表示対象")]],
				["EXTRA", [createSnippet("除外対象")]],
			]);
		},
	});

	const result = await reader({ page: "2", query: "仏教" });
	expect(snippetInputs).toEqual([items.slice(30, 60).map((item) => item.id)]);
	expect(result?.transcriptSnippetsByTalkId.has("EXTRA")).toBe(false);
});
```

Add the cache boundary test:

```ts
test("正規化queryをTTL内で再利用し期限ちょうどで再計算する", async () => {
	let now = 0;
	let matchCalls = 0;
	const items = createItems(1);
	const reader = createTalkListingReader(
		{
			loadItems: async () => items,
			findMatchingTalkIds: async () => {
				matchCalls += 1;
				return items.map((item) => item.id);
			},
			buildTranscriptSnippets: async () => new Map(),
		},
		{ now: () => now },
	);

	await reader({ page: "1", query: " 慈悲   瞑想 " });
	await reader({ page: "1", query: "慈悲 瞑想" });
	expect(matchCalls).toBe(1);
	now = 5 * 60 * 1000;
	await reader({ page: "1", query: "慈悲 瞑想" });
	expect(matchCalls).toBe(2);
});

test("ID cacheを上限内に保ち最古queryを再計算する", async () => {
	let matchCalls = 0;
	const items = createItems(1);
	const reader = createTalkListingReader(
		{
			loadItems: async () => items,
			findMatchingTalkIds: async () => {
				matchCalls += 1;
				return items.map((item) => item.id);
			},
			buildTranscriptSnippets: async () => new Map(),
		},
		{ maxSearchCacheEntries: 2 },
	);
	for (const query of ["q1", "q2", "q3", "q1"]) {
		await reader({ page: "1", query });
	}
	expect(matchCalls).toBe(4);
});

test("0件ではsnippetを呼ばず依存エラーを隠さない", async () => {
	let snippetCalls = 0;
	const emptyReader = createTalkListingReader({
		loadItems: async () => createItems(1),
		findMatchingTalkIds: async () => [],
		buildTranscriptSnippets: async () => {
			snippetCalls += 1;
			return new Map();
		},
	});
	expect(await emptyReader({ page: "1", query: "不存在" })).toMatchObject({
		totalItems: 0,
	});
	expect(snippetCalls).toBe(0);

	const failingReader = createTalkListingReader({
		loadItems: async () => createItems(1),
		findMatchingTalkIds: async () => {
			throw new Error("search failed");
		},
		buildTranscriptSnippets: async () => new Map(),
	});
	await expect(failingReader({ page: "1", query: "慈悲" })).rejects.toThrow(
		"search failed",
	);
});
```

- [ ] **Step 2: Run the reader test and verify RED**

```bash
set -euo pipefail
/Users/tt/.bun/bin/bun test app/application/talk/listing-reader.test.ts
```

Expected: FAIL because `listing-reader.ts` does not exist.

- [ ] **Step 3: Implement the dependency-injected reader**

Create these exact constants and dependency types:

```ts
export const TALK_SEARCH_MATCH_CACHE_TTL_MS = 5 * 60 * 1000;
export const TALK_SEARCH_MATCH_CACHE_MAX_ENTRIES = 100;

export type TalkListingDependencies = {
	loadItems: () => Promise<TalkGalleryItem[]>;
	findMatchingTalkIds: (query: string) => Promise<readonly string[]>;
	buildTranscriptSnippets: (
		query: string,
		talkIds: readonly string[],
	) => Promise<ReadonlyMap<string, TranscriptSearchSnippet[]>>;
};

export type TalkListingReaderOptions = {
	now?: () => number;
	searchCacheTtlMs?: number;
	maxSearchCacheEntries?: number;
};
```

Implement the reader with this control flow:

```ts
export function createTalkListingReader(
	dependencies: TalkListingDependencies,
	options: TalkListingReaderOptions = {},
) {
	const now = options.now ?? Date.now;
	const ttl = options.searchCacheTtlMs ?? TALK_SEARCH_MATCH_CACHE_TTL_MS;
	const maxEntries =
		options.maxSearchCacheEntries ?? TALK_SEARCH_MATCH_CACHE_MAX_ENTRIES;
	const cache = new Map<string, { expiresAt: number; talkIds: string[] }>();

	async function readMatchingIds(query: string) {
		const tokens = tokenizeSearchQuery(query);
		if (tokens.length === 0) return [];
		const key = tokens.join("\u0000");
		const cached = cache.get(key);
		if (cached && cached.expiresAt > now()) return cached.talkIds;
		if (cached) cache.delete(key);

		const talkIds = [
			...(await dependencies.findMatchingTalkIds(tokens.join(" "))),
		];
		if (cache.size >= maxEntries) {
			const oldestKey = cache.keys().next().value;
			if (oldestKey !== undefined) cache.delete(oldestKey);
		}
		cache.set(key, { expiresAt: now() + ttl, talkIds });
		return talkIds;
	}

	return async function readTalkListingPage(
		request: TalkListingRequest,
	): Promise<TalkListingPage | null> {
		const items = await dependencies.loadItems();
		const normalized = normalizeTalkListingRequest(items, request);
		if (!normalized) return null;

		const matchedTalkIds = normalized.conditions.query
			? await readMatchingIds(normalized.conditions.query)
			: [];
		const page = buildTalkListingPage(items, normalized, matchedTalkIds);
		if (!page || !normalized.conditions.query || page.items.length === 0) {
			return page;
		}

		const visibleIds = page.items.map((item) => item.id);
		const snippets = await dependencies.buildTranscriptSnippets(
			tokenizeSearchQuery(normalized.conditions.query).join(" "),
			visibleIds,
		);
		return buildTalkListingPage(items, normalized, matchedTalkIds, snippets);
	};
}
```

- [ ] **Step 4: Bind the real repositories without eagerly reading transcripts**

Create `app/infrastructure/talk/listing-reader.ts`:

```ts
import { createTalkListingReader } from "../../application/talk/listing-reader";
import { buildTalkGalleryItems } from "../../application/talk/gallery";
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
```

- [ ] **Step 5: Run focused tests and verify GREEN**

```bash
set -euo pipefail
/Users/tt/.bun/bin/bun test \
  app/application/talk/listing-reader.test.ts \
  app/application/talk/listing.test.ts \
  app/application/talk/transcript-search.test.ts
```

Expected: all tests PASS; the no-query test reports zero search-dependency calls.

- [ ] **Step 6: Format and commit Task 3**

```bash
set -euo pipefail
/Users/tt/.bun/bin/bunx oxfmt \
  app/application/talk/listing-reader.ts \
  app/application/talk/listing-reader.test.ts \
  app/infrastructure/talk/listing-reader.ts
git diff --check
git add \
  app/application/talk/listing-reader.ts \
  app/application/talk/listing-reader.test.ts \
  app/infrastructure/talk/listing-reader.ts
git commit -m "feat: cache paginated talk search matches"
```

---

### Task 4: Make gallery, detail, and cue links page-aware

**Files:**

- Modify: `app/application/talk/links.ts`
- Modify: `app/application/talk/links.test.ts`
- Modify: `app/components/talk-gallery/talk-gallery-card.tsx`
- Create: `app/components/talk-gallery/talk-gallery-card.test.tsx`
- Modify: `app/talks/[id]/page.tsx`
- Modify: `app/talks/[id]/page.test.tsx`

**Interfaces:**

- Produces: `TalkGalleryHrefOptions` with `page`, `query`, `collectionId`, and `seriesId`.
- Produces: `parseTalkDetailGalleryPage(value): number`.
- Changes detail and cue builders from positional gallery arguments to one options object.

- [ ] **Step 1: Write failing link-state tests**

Replace positional expectations and add:

```ts
expect(buildTalksHref({ page: 1 })).toBe("/talks");
expect(
	buildTalksHref({
		page: 3,
		query: "慈悲",
		collectionId: "scripture_commentary",
		seriesId: "abhidhamma",
	}),
).toBe(
	"/talks/page/3?query=%E6%85%88%E6%82%B2&collection=scripture_commentary&series=abhidhamma",
);
expect(
	buildTalkDetailHref("TALK-1", {
		page: 3,
		query: "慈悲",
		collectionId: "scripture_commentary",
		seriesId: "abhidhamma",
	}),
).toContain("galleryPage=3");
expect(
	buildTranscriptCueHref("TALK-1", 12, {
		page: 3,
		query: "慈悲",
	}),
).toContain("galleryPage=3");
expect(parseTalkDetailGalleryPage("3")).toBe(3);
for (const value of ["", "0", "03", "2.0", "x"]) {
	expect(parseTalkDetailGalleryPage(value)).toBe(1);
}
```

- [ ] **Step 2: Run link tests and verify RED**

```bash
set -euo pipefail
/Users/tt/.bun/bin/bun test app/application/talk/links.test.ts
```

Expected: FAIL on the new options object and missing page parser.

- [ ] **Step 3: Refactor link builders**

Export:

```ts
export const TALK_DETAIL_GALLERY_PAGE_PARAM = "galleryPage";

export type TalkGalleryHrefOptions = {
	page?: number;
	query?: string;
	collectionId?: ContentCollectionId | "";
	seriesId?: ContentSeriesId | "";
};

export function parseTalkDetailGalleryPage(value: string): number {
	if (!/^[1-9]\d*$/.test(value)) return 1;
	const page = Number(value);
	return Number.isSafeInteger(page) ? page : 1;
}
```

Replace the three builders with this shared parameter logic, then update every production call site to the object form:

```ts
function normalizeGalleryPage(page: number | undefined): number {
	return Number.isSafeInteger(page) && (page ?? 1) > 1 ? page! : 1;
}

function appendGalleryDetailParams(
	params: URLSearchParams,
	options: TalkGalleryHrefOptions,
) {
	const query = options.query?.trim() ?? "";
	if (query) params.set(TALK_DETAIL_GALLERY_QUERY_PARAM, query);
	if (options.collectionId) {
		params.set(TALK_DETAIL_GALLERY_COLLECTION_PARAM, options.collectionId);
	}
	if (options.seriesId) {
		params.set(TALK_DETAIL_GALLERY_SERIES_PARAM, options.seriesId);
	}
	const page = normalizeGalleryPage(options.page);
	if (page > 1) {
		params.set(TALK_DETAIL_GALLERY_PAGE_PARAM, String(page));
	}
}

export function buildTalksHref(
	queryOrOptions: string | TalkGalleryHrefOptions = "",
): string {
	const options =
		typeof queryOrOptions === "string"
			? { query: queryOrOptions }
			: queryOrOptions;
	const page = normalizeGalleryPage(options.page);
	const path = page > 1 ? `/talks/page/${page}` : "/talks";
	const params = new URLSearchParams();
	const query = options.query?.trim() ?? "";
	if (query) params.set(TALK_GALLERY_QUERY_PARAM, query);
	if (options.collectionId) {
		params.set(TALK_GALLERY_COLLECTION_PARAM, options.collectionId);
	}
	if (options.seriesId) {
		params.set(TALK_GALLERY_SERIES_PARAM, options.seriesId);
	}
	const search = params.toString();
	return search ? `${path}?${search}` : path;
}

export function buildTalkDetailHref(
	talkId: string,
	options: TalkGalleryHrefOptions = {},
): string {
	const params = new URLSearchParams();
	appendGalleryDetailParams(params, options);
	const search = params.toString();
	const path = buildTalkDetailPath(talkId);
	return search ? `${path}?${search}` : path;
}

export function buildTranscriptCueHref(
	talkId: string,
	cueIndex: number,
	options: TalkGalleryHrefOptions = {},
): string {
	const params = new URLSearchParams();
	const query = options.query?.trim() ?? "";
	if (query) {
		params.set(TALK_DETAIL_TRANSCRIPT_QUERY_PARAM, query);
	}
	appendGalleryDetailParams(params, options);
	params.set(TALK_DETAIL_TRANSCRIPT_CUE_PARAM, String(cueIndex));
	return `${buildTalkDetailPath(talkId)}?${params.toString()}#transcript-cue-${cueIndex}`;
}
```

- [ ] **Step 4: Write the failing server-card link test**

Render one fake card with `galleryOptions` and one transcript snippet. Assert:

- detail and cue hrefs contain `galleryPage=3`;
- collection link preserves query, resets page, and drops an incompatible series;
- series link forces `collection=scripture_commentary`;
- rendering without `galleryOptions` keeps homepage badges as spans rather than filter anchors.
- the transitional callback props still render the old collection/series buttons so the existing client gallery remains type-safe until Task 5 removes it.

Run:

```bash
set -euo pipefail
/Users/tt/.bun/bin/bun test app/components/talk-gallery/talk-gallery-card.test.tsx
```

Expected: FAIL because callbacks still control the badges.

- [ ] **Step 5: Add opt-in filter links with temporary client-gallery compatibility**

Change the card props to the following transitional contract:

```ts
type Props = {
	talk: TalkGalleryItem;
	searchTokens: string[];
	galleryOptions?: TalkGalleryHrefOptions;
	transcriptSnippets?: Array<
		TranscriptSearchSnippet | TalkSearchTranscriptSnippet
	>;
	thumbnailPriority?: boolean;
	searchQuery?: string;
	selectedCollectionId?: ContentCollectionId | "";
	selectedSeriesId?: ContentSeriesId | "";
	onNavigateToTalk?: () => void;
	onSelectCollection?: (collectionId: ContentCollectionId) => void;
	onSelectSeries?: (seriesId: ContentSeriesId) => void;
};
```

Import `TranscriptSearchSnippet` from `../../application/talk/search` and temporarily import `TalkSearchTranscriptSnippet` from the preserved `search-api.ts`; the union keeps the old hook's optional `start`/`startLabel` shape assignable until its deletion. When `galleryOptions` exists, render collection and series badges as `Link` values built with `buildTalksHref()`. When it is absent but the matching legacy callback exists, retain the current button behavior for `talk-gallery-row.tsx`; when neither exists, render the same spans used on the homepage. Build detail and cue links with `galleryOptions` when supplied, otherwise derive their temporary compatibility state from `searchQuery`, `selectedCollectionId`, and `selectedSeriesId`. Keep `onNavigateToTalk` on legacy detail/cue links. Task 5 deletes the only old consumer, removes the compatibility import and union, and then removes all six compatibility props before its commit.

Use these exact derived hrefs before the JSX:

```ts
const detailOptions: TalkGalleryHrefOptions = galleryOptions ?? {
	query: searchQuery,
	collectionId: selectedCollectionId,
	seriesId: selectedSeriesId,
};
const talkDetailHref = buildTalkDetailHref(talk.id, detailOptions);
const collectionHref = galleryOptions
	? buildTalksHref({
			query: galleryOptions.query,
			collectionId: talk.collectionId,
			seriesId:
				talk.collectionId === "scripture_commentary"
					? galleryOptions.seriesId
					: "",
		})
	: null;
const seriesHref =
	galleryOptions && talk.seriesId
		? buildTalksHref({
				query: galleryOptions.query,
				collectionId: "scripture_commentary",
				seriesId: talk.seriesId,
			})
		: null;
```

The transitional collection badge branch order is: render the normal `Link` when `collectionHref` exists, otherwise render the existing button when `onSelectCollection` exists, otherwise render the homepage span. The series badge follows the same three-way order. The cue link calls:

```tsx
href={buildTranscriptCueHref(
	talk.id,
	snippet.cueIndex,
	detailOptions,
)}
```

- [ ] **Step 6: Preserve the numbered page in the detail back link**

Import `TALK_DETAIL_GALLERY_PAGE_PARAM`, add `| typeof TALK_DETAIL_GALLERY_PAGE_PARAM` to the existing `TalkDetailSearchParamName` union, read `galleryPage` with `parseTalkDetailGalleryPage()` in `app/talks/[id]/page.tsx`, and pass it into `buildTalksHref()`. Add a test whose input has page 3 plus all filters and whose output contains:

```text
href="/talks/page/3?query=%E4%BB%8F%E6%95%99&amp;collection=scripture_commentary&amp;series=abhidhamma"
```

Add an invalid `galleryPage: "03"` case that returns to page 1.

- [ ] **Step 7: Run, format, and commit Task 4**

```bash
set -euo pipefail
/Users/tt/.bun/bin/bun test \
  app/application/talk/links.test.ts \
  app/components/talk-gallery/talk-gallery-card.test.tsx \
  'app/talks/[id]/page.test.tsx'
/Users/tt/.bun/bin/bun run build
/Users/tt/.bun/bin/bunx oxfmt \
  app/application/talk/links.ts \
  app/application/talk/links.test.ts \
  app/components/talk-gallery/talk-gallery-card.tsx \
  app/components/talk-gallery/talk-gallery-card.test.tsx \
  'app/talks/[id]/page.tsx' \
  'app/talks/[id]/page.test.tsx'
git diff --check
git add \
  app/application/talk/links.ts \
  app/application/talk/links.test.ts \
  app/components/talk-gallery/talk-gallery-card.tsx \
  app/components/talk-gallery/talk-gallery-card.test.tsx \
  'app/talks/[id]/page.tsx' \
  'app/talks/[id]/page.test.tsx'
git commit -m "feat: preserve talk listing page in detail links"
```

---

### Task 5: Render the complete listing and numbered routes on the server

**Files:**

- Create: `app/components/talk-listing.tsx`
- Create: `app/components/talk-listing-pagination.tsx`
- Create: `app/components/talk-listing.test.tsx`
- Modify: `app/components/talk-gallery/decade-jump-nav.tsx`
- Modify: `app/components/talk-gallery/talk-gallery-section-header.tsx`
- Modify: `app/components/talk-gallery/talk-gallery-card.tsx`
- Modify: `app/components/talk-gallery/talk-gallery-card.test.tsx`
- Create: `app/talks/talk-listing-page.tsx`
- Modify: `app/talks/page.tsx`
- Modify: `app/talks/page.test.tsx`
- Create: `app/talks/page/[page]/page.tsx`
- Create: `app/talks/page/[page]/page.test.tsx`
- Modify: `next.config.ts`
- Create: `next.config.test.ts`
- Delete after the new routes pass: `app/components/talk-gallery-loader.tsx`
- Delete after the new routes pass: `app/components/deferred-talk-gallery.tsx`
- Delete after the new routes pass: `app/components/talk-gallery.tsx`
- Delete after the new routes pass: `app/components/talk-gallery/talk-gallery-row.tsx`
- Delete after the new routes pass: `app/components/talk-gallery/use-talk-gallery-data.ts`

**Interfaces:**

- Produces: `TalkListing({ listing })`.
- Produces: `buildVisibleTalkListingPages(page, totalPages)`.
- Produces: `renderTalkListingPage({ page, searchParams })` and `buildTalkListingMetadata()`.

- [ ] **Step 1: Write failing component tests for initial HTML**

Create a fake page-2 result with 65 total matches and assert the static markup contains:

```tsx
expect(html).toContain('action="/talks"');
expect(html).toContain('method="get"');
expect(html).toContain('name="query"');
expect(html).toContain('type="hidden" name="collection"');
expect(html).toContain("検索");
expect(html).toContain("全65件中 31〜60件");
expect(html).toContain(
	'href="/talks/page/3?query=%E4%BB%8F%E6%95%99&amp;collection=monthly_talk"',
);
expect(html).toContain("galleryPage=2");
```

Also assert:

- an unfiltered decade target links to `/talks/page/2#talk-decade-2010`;
- the target section has `id="talk-decade-2010"`;
- a one-page result has no pagination nav;
- a valid zero result keeps the controls and says `全0件`;
- `buildVisibleTalkListingPages(16, 31)` equals `[1, "ellipsis", 15, 16, 17, "ellipsis", 31]`.

- [ ] **Step 2: Run the component test and verify RED**

```bash
set -euo pipefail
/Users/tt/.bun/bin/bun test app/components/talk-listing.test.tsx
```

Expected: FAIL because the server listing components do not exist.

- [ ] **Step 3: Implement compact pagination and decade links**

Create `app/components/talk-listing-pagination.tsx` with this page model:

```ts
export type VisibleTalkListingPage = number | "ellipsis";

export function buildVisibleTalkListingPages(
	currentPage: number,
	totalPages: number,
): VisibleTalkListingPage[] {
	if (totalPages <= 1) return [];
	const candidates = [
		1,
		currentPage - 1,
		currentPage,
		currentPage + 1,
		totalPages,
	]
		.filter((page) => page >= 1 && page <= totalPages)
		.filter((page, index, pages) => pages.indexOf(page) === index)
		.sort((left, right) => left - right);
	const visible: VisibleTalkListingPage[] = [];
	for (const page of candidates) {
		const previous = visible.at(-1);
		if (typeof previous === "number" && page - previous > 1) {
			visible.push("ellipsis");
		}
		visible.push(page);
	}
	return visible;
}
```

The component returns null when `totalPages <= 1` and otherwise renders a `nav aria-label="動画一覧のページ"`. Previous, numeric, and next links all use:

```tsx
<Link
	aria-current={targetPage === page ? "page" : undefined}
	href={buildTalksHref({
		page: targetPage,
		query: conditions.query,
		collectionId: conditions.collectionId,
		seriesId: conditions.seriesId,
	})}
	prefetch={false}
>
	{targetPage}
</Link>
```

Render ellipses as non-link spans with stable keys `ellipsis-${index}`.

Rewrite `DecadeJumpNav` to accept:

```ts
type Props = {
	targets: TalkListingDecadeTarget[];
};
```

Render no nav for zero/one target. Otherwise each target is a normal `Link` to:

```ts
`${buildTalksHref({ page: target.page })}#${target.anchorId}`;
```

There are no click handlers and no `"use client"` directive.

The complete map inside the nav is:

```tsx
{
	targets.map((target) => (
		<Link
			className="shrink-0 text-xs font-medium text-gray-500 underline-offset-4 transition hover:text-gray-900 hover:underline"
			href={`${buildTalksHref({ page: target.page })}#${target.anchorId}`}
			key={target.label}
			prefetch={false}
		>
			{target.label}
			<span className="ml-0.5 text-gray-400">({target.count})</span>
		</Link>
	));
}
```

- [ ] **Step 4: Implement the server listing composer**

`TalkListing` must render:

1. the sticky search area using the current control classes;
2. a GET form targeting `/talks`, a named search input, visible submit button, and hidden selected collection/series values;
3. active-condition clear links and a clear-all `/talks` link;
4. compact collection links and horizontally scrollable series links only for `scripture_commentary`;
5. `全N件中 A〜B件` or `全0件`;
6. decade links only when `listing.decadeTargets` is nonempty;
7. adjacent sections from `buildTalkListingSections(listing.items)` without sorting;
8. a three-column responsive grid of `TalkGalleryCard` values with `data-talk-gallery-item` on each wrapper and thumbnail priority for only the first three page items;
9. the existing no-result copy when `items` is empty;
10. `TalkListingPagination` after the cards.

Pass this exact state to every card:

```ts
const galleryOptions: TalkGalleryHrefOptions = {
	page: listing.page,
	query: listing.conditions.query,
	collectionId: listing.conditions.collectionId,
	seriesId: listing.conditions.seriesId,
};
```

Use this concrete component body; retain the current longer Tailwind class strings when moving it into the repository:

```tsx
export default function TalkListing({ listing }: { listing: TalkListingPage }) {
	const { conditions } = listing;
	const searchTokens = tokenizeSearchQuery(conditions.query);
	const sections = buildTalkListingSections(listing.items);
	const galleryOptions: TalkGalleryHrefOptions = {
		page: listing.page,
		query: conditions.query,
		collectionId: conditions.collectionId,
		seriesId: conditions.seriesId,
	};
	const collectionLabel = listing.collectionOptions.find(
		({ id }) => id === conditions.collectionId,
	)?.label;
	const seriesLabel = listing.seriesOptions.find(
		({ id }) => id === conditions.seriesId,
	)?.label;

	return (
		<div className="flex flex-col gap-10">
			<div className="sticky top-16 z-10 bg-white/95 py-4 backdrop-blur">
				<form action="/talks" className="flex gap-2" method="get">
					<input
						aria-label="法話を検索"
						className="search-cancel-none w-full rounded-sm border border-[#d6c6ad] bg-white px-4 py-3 text-sm"
						defaultValue={conditions.query}
						name="query"
						placeholder="キーワード・文字起こしで検索"
						type="search"
					/>
					{conditions.collectionId && (
						<input
							name="collection"
							type="hidden"
							value={conditions.collectionId}
						/>
					)}
					{conditions.seriesId && (
						<input name="series" type="hidden" value={conditions.seriesId} />
					)}
					<button className="home-outline-button shrink-0" type="submit">
						検索
					</button>
				</form>

				<div className="mt-3 flex flex-wrap gap-2">
					{conditions.query && (
						<Link
							href={buildTalksHref({
								collectionId: conditions.collectionId,
								seriesId: conditions.seriesId,
							})}
							prefetch={false}
						>
							検索: {conditions.query} ×
						</Link>
					)}
					{collectionLabel && (
						<Link
							href={buildTalksHref({ query: conditions.query })}
							prefetch={false}
						>
							{collectionLabel} ×
						</Link>
					)}
					{seriesLabel && (
						<Link
							href={buildTalksHref({
								query: conditions.query,
								collectionId: conditions.collectionId,
							})}
							prefetch={false}
						>
							{seriesLabel} ×
						</Link>
					)}
					{(conditions.query ||
						conditions.collectionId ||
						conditions.seriesId) && (
						<Link href="/talks" prefetch={false}>
							すべて解除
						</Link>
					)}
				</div>

				<nav
					aria-label="分類で絞り込む"
					className="scrollbar-none mt-3 flex gap-3 overflow-x-auto"
				>
					{listing.collectionOptions.map((option) => (
						<Link
							href={buildTalksHref({
								query: conditions.query,
								collectionId: option.id,
								seriesId:
									option.id === "scripture_commentary"
										? conditions.seriesId
										: "",
							})}
							key={option.id}
							prefetch={false}
						>
							{option.label}
						</Link>
					))}
				</nav>

				{conditions.collectionId === "scripture_commentary" && (
					<nav
						aria-label="シリーズで絞り込む"
						className="scrollbar-none mt-2 flex gap-3 overflow-x-auto"
					>
						{listing.seriesOptions
							.filter(
								(option) => option.collectionId === "scripture_commentary",
							)
							.map((option) => (
								<Link
									href={buildTalksHref({
										query: conditions.query,
										collectionId: "scripture_commentary",
										seriesId: option.id,
									})}
									key={option.id}
									prefetch={false}
								>
									{option.label}
								</Link>
							))}
					</nav>
				)}

				<p className="mt-3 text-xs text-gray-500">
					{listing.totalItems === 0
						? "全0件"
						: `全${listing.totalItems}件中 ${listing.rangeStart}〜${listing.rangeEnd}件`}
				</p>
				<DecadeJumpNav targets={listing.decadeTargets} />
			</div>

			{sections.length === 0 ? (
				<div className="rounded-lg border border-[#d6c6ad] bg-white p-10 text-center text-sm text-[#888]">
					検索条件に一致するデータが見つかりませんでした。条件を変えてお試しください。
				</div>
			) : (
				<div className="space-y-12">
					{sections.map((section, sectionIndex) => (
						<section id={section.anchorId} key={section.label}>
							<TalkGallerySectionHeader
								count={section.items.length}
								isFirst={sectionIndex === 0}
								label={section.label}
								searchTokens={searchTokens}
							/>
							<div className="grid gap-8 pt-6 sm:grid-cols-2 lg:grid-cols-3">
								{section.items.map((talk) => {
									const pageIndex = listing.items.findIndex(
										(item) => item.id === talk.id,
									);
									return (
										<div data-talk-gallery-item key={talk.id}>
											<TalkGalleryCard
												galleryOptions={galleryOptions}
												searchTokens={searchTokens}
												talk={talk}
												thumbnailPriority={pageIndex < 3}
												transcriptSnippets={
													listing.transcriptSnippetsByTalkId.get(talk.id) ?? []
												}
											/>
										</div>
									);
								})}
							</div>
						</section>
					))}
				</div>
			)}

			<TalkListingPagination
				conditions={conditions}
				nextPage={listing.nextPage}
				page={listing.page}
				previousPage={listing.previousPage}
				totalPages={listing.totalPages}
			/>
		</div>
	);
}
```

Change `TalkGallerySectionHeader` to the prop shape `{ label: string; count: number; isFirst: boolean; searchTokens: string[] }` and remove its import from the deleted grouping module. The parent `section` owns the single anchor ID, so the header must not emit a duplicate ID.

- [ ] **Step 5: Write failing route and metadata tests**

Rewrite `app/talks/page.test.tsx` to assert exactly 30 `data-talk-gallery-item` markers, compare detail IDs with the first 30 `buildTalkGalleryItems(await getTalks())` values, and assert the search form exists immediately with no loader copy.

Create numbered-route tests that:

- compare page 2 with items 30–59;
- assert previous `/talks` and next `/talks/page/3`;
- assert detail links carry `galleryPage=2`;
- reject `0`, `02`, `2.0`, and totalPages + 1;
- self-canonicalize unfiltered page 2;
- emit `robots: { index: false, follow: true }` and no canonical for any nonblank recognized filter.

- [ ] **Step 6: Implement the shared route renderer**

Create `app/talks/talk-listing-page.tsx` with:

```ts
export type TalkListingSearchParams = Partial<
	Record<
		"query" | "collection" | "series",
		string | string[] | undefined
	>
>;

export async function renderTalkListingPage({
	page,
	searchParams,
}: {
	page: string;
	searchParams?: Promise<TalkListingSearchParams>;
}) {
	const params = (await searchParams) ?? {};
	const listing = await readTalkListingPage({
		page,
		query: getFirstSearchParam(params.query),
		collectionId: getFirstSearchParam(params.collection),
		seriesId: getFirstSearchParam(params.series),
	});
	if (!listing) notFound();

	return (
		<div className="min-h-screen flex flex-col bg-white text-[#303030]">
			<div className="flex-1">
				<Header />
				<main>
					<section
						className="home-gallery-bg min-h-screen px-5 pb-16 pt-28 sm:px-8 lg:pb-24 lg:pt-36"
						id="talks"
					>
						<div className="mx-auto max-w-7xl">
							<h1 className="home-section-title text-center font-display text-[28px] font-semibold">
								動画一覧
							</h1>
							<div className="mt-10">
								<TalkListing listing={listing} />
							</div>
						</div>
					</section>
				</main>
			</div>
			<ClientHomeActions />
			<Footer />
		</div>
	);
}
```

Add this pure metadata helper; it never calls `readTalkListingPage`:

```ts
export function buildTalkListingMetadata(
	page: number,
	params: TalkListingSearchParams,
): Metadata {
	const hasConditions = [
		getFirstSearchParam(params.query),
		getFirstSearchParam(params.collection),
		getFirstSearchParam(params.series),
	].some((value) => value.trim().length > 0);
	const title = page > 1 ? `動画一覧 ${page}ページ目` : "動画一覧";
	const base = {
		title,
		description: `スマナサーラ長老の法話動画一覧${page > 1 ? `の${page}ページ目` : ""}です。`,
	};
	if (hasConditions) {
		return {
			...base,
			robots: { index: false, follow: true },
		};
	}
	return {
		...base,
		alternates: {
			canonical: buildCanonicalUrl(buildTalksHref({ page })),
		},
	};
}
```

`app/talks/page.tsx` delegates with page `"1"`:

```tsx
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
```

The numbered route delegates with the raw segment and generates only pages 2 through the current total:

```tsx
type Props = {
	params: Promise<{ page: string }>;
	searchParams?: Promise<TalkListingSearchParams>;
};
export const dynamicParams = false;

export async function generateStaticParams() {
	const firstPage = await readTalkListingPage({ page: "1" });
	if (!firstPage) return [];
	return Array.from(
		{ length: Math.max(0, firstPage.totalPages - 1) },
		(_, index) => ({ page: String(index + 2) }),
	);
}

export async function generateMetadata({
	params,
	searchParams,
}: Props): Promise<Metadata> {
	const { page: rawPage } = await params;
	const page = parseTalkListingPageNumber(rawPage);
	if (!page) return { title: "動画一覧" };
	return buildTalkListingMetadata(page, (await searchParams) ?? {});
}

export default async function TalkListingNumberedPage({
	params,
	searchParams,
}: Props) {
	const { page } = await params;
	return renderTalkListingPage({ page, searchParams });
}
```

- [ ] **Step 7: Configure the page-1 redirect and both search traces**

Change `next.config.ts` to include:

```ts
outputFileTracingIncludes: {
	"/talks": ["./app/generated/transcript-search-documents.json"],
	"/talks/page/[page]": [
		"./app/generated/transcript-search-documents.json",
	],
},
async redirects() {
	return [
		{
			source: "/talks/page/1",
			destination: "/talks",
			permanent: true,
		},
	];
},
```

Test both keys and the permanent redirect in `next.config.test.ts`.

- [ ] **Step 8: Remove the replaced client UI and finalize the card contract**

After the root and numbered routes render through `TalkListing`, delete the old UI consumers before changing the shared component contracts:

```bash
set -euo pipefail
git rm \
  app/components/talk-gallery-loader.tsx \
  app/components/deferred-talk-gallery.tsx \
  app/components/talk-gallery.tsx \
  app/components/talk-gallery/talk-gallery-row.tsx \
  app/components/talk-gallery/use-talk-gallery-data.ts
```

Now remove `searchQuery`, `selectedCollectionId`, `selectedSeriesId`, `onNavigateToTalk`, `onSelectCollection`, and `onSelectSeries` from `TalkGalleryCard`. Delete the temporary callback/button branches and `TalkSearchTranscriptSnippet` compatibility import/union, leaving only normal filter links when `galleryOptions` exists, homepage spans otherwise, and the final `TranscriptSearchSnippet[]` prop from `application/talk/search`.

Update the card test to remove the transitional callback case and prove the final contract has no callback-driven button. Then verify there is no surviving import or call site for the removed UI:

```bash
set -euo pipefail
! rg -n \
  'TalkGalleryLoader|DeferredTalkGallery|TalkGalleryRow|useTalkGalleryData|onSelectCollection|onSelectSeries' \
  app/components app/talks
```

This deletion must happen in Task 5, not Task 7: the rewritten `DecadeJumpNav`, `TalkGallerySectionHeader`, and final card props intentionally do not support the old Virtuoso consumer.

- [ ] **Step 9: Run focused tests and verify GREEN**

```bash
set -euo pipefail
/Users/tt/.bun/bin/bun test \
  app/components/talk-listing.test.tsx \
  app/components/talk-gallery/talk-gallery-card.test.tsx \
  app/talks/page.test.tsx \
  'app/talks/page/[page]/page.test.tsx' \
  next.config.test.ts
/Users/tt/.bun/bin/bun run build
```

Expected: all tests PASS, root renders 30 cards, page 2 renders the next 30, and filtered metadata has no canonical.

- [ ] **Step 10: Format and commit Task 5**

```bash
set -euo pipefail
/Users/tt/.bun/bin/bunx oxfmt \
  app/components/talk-listing.tsx \
  app/components/talk-listing-pagination.tsx \
  app/components/talk-listing.test.tsx \
  app/components/talk-gallery/talk-gallery-card.tsx \
  app/components/talk-gallery/talk-gallery-card.test.tsx \
  app/components/talk-gallery/decade-jump-nav.tsx \
  app/components/talk-gallery/talk-gallery-section-header.tsx \
  app/talks/talk-listing-page.tsx \
  app/talks/page.tsx \
  app/talks/page.test.tsx \
  'app/talks/page/[page]/page.tsx' \
  'app/talks/page/[page]/page.test.tsx' \
  next.config.ts \
  next.config.test.ts
git diff --check
git add \
  app/components/talk-listing.tsx \
  app/components/talk-listing-pagination.tsx \
  app/components/talk-listing.test.tsx \
  app/components/talk-gallery/talk-gallery-card.tsx \
  app/components/talk-gallery/talk-gallery-card.test.tsx \
  app/components/talk-gallery/decade-jump-nav.tsx \
  app/components/talk-gallery/talk-gallery-section-header.tsx \
  app/talks/talk-listing-page.tsx \
  app/talks/page.tsx \
  app/talks/page.test.tsx \
  'app/talks/page/[page]/page.tsx' \
  'app/talks/page/[page]/page.test.tsx' \
  next.config.ts \
  next.config.test.ts
git commit -m "feat: render paginated talk listing on server"
```

---

### Task 6: Redirect the legacy archive and replace its sitemap entries

**Files:**

- Create: `app/application/talk/archive-redirect.ts`
- Create: `app/application/talk/archive-redirect.test.ts`
- Delete: `app/application/talk/archive.ts`
- Delete: `app/application/talk/archive.test.ts`
- Replace: `app/talks/archive/[page]/page.tsx`
- Replace: `app/talks/archive/[page]/page.test.tsx`
- Modify: `app/sitemap.ts`
- Modify: `app/sitemap.test.ts`

**Interfaces:**

- Produces: `buildLegacyTalkArchiveRedirectPage(totalItems, rawPage): number | null`.
- Legacy mapping for 901 talks is exactly `[1, 4, 7, 11, 14, 17, 21, 24, 27, 31]`.

- [ ] **Step 1: Write failing mapping and route tests**

```ts
expect(
	Array.from({ length: 10 }, (_, index) =>
		buildLegacyTalkArchiveRedirectPage(901, String(index + 1)),
	),
).toEqual([1, 4, 7, 11, 14, 17, 21, 24, 27, 31]);
for (const page of ["0", "02", "11", "x"]) {
	expect(buildLegacyTalkArchiveRedirectPage(901, page)).toBeNull();
}
```

Mock `permanentRedirect` and assert archive 1 targets `/talks`, archive 2 targets `/talks/page/4`, archive 10 targets `/talks/page/31`, and invalid pages call `notFound()`.

- [ ] **Step 2: Run legacy tests and verify RED**

```bash
set -euo pipefail
/Users/tt/.bun/bin/bun test \
  app/application/talk/archive-redirect.test.ts \
  'app/talks/archive/[page]/page.test.tsx'
```

Expected: FAIL because the legacy mapper does not exist and the route still renders UI.

- [ ] **Step 3: Implement the strict mapper and redirect-only route**

Use:

```ts
const LEGACY_PAGE_SIZE = 100;

export function buildLegacyTalkArchiveRedirectPage(
	totalItems: number,
	rawPage: string,
): number | null {
	if (!/^[1-9]\d*$/.test(rawPage)) return null;
	const page = Number(rawPage);
	const totalPages = Math.max(1, Math.ceil(totalItems / LEGACY_PAGE_SIZE));
	if (!Number.isSafeInteger(page) || page > totalPages) return null;
	return (
		Math.floor(((page - 1) * LEGACY_PAGE_SIZE) / TALK_LISTING_PAGE_SIZE) + 1
	);
}
```

The archive route retains `generateStaticParams()` and `dynamicParams = false` for the valid legacy URLs, removes metadata/Header/Footer/list markup, and is exactly this shape:

```tsx
type Props = { params: Promise<{ page: string }> };
export const dynamicParams = false;

export async function generateStaticParams() {
	const totalItems = (await getTalks()).length;
	const totalPages = Math.max(1, Math.ceil(totalItems / 100));
	return Array.from({ length: totalPages }, (_, index) => ({
		page: String(index + 1),
	}));
}

export default async function LegacyTalkArchivePage({ params }: Props) {
	const { page } = await params;
	const targetPage = buildLegacyTalkArchiveRedirectPage(
		(await getTalks()).length,
		page,
	);
	if (!targetPage) notFound();
	permanentRedirect(buildTalksHref({ page: targetPage }));
}
```

- [ ] **Step 4: Replace sitemap expectations**

Sitemap must contain:

- the existing `/talks` static URL;
- exactly pages `/talks/page/2` through `/talks/page/31` once each;
- all 901 unchanged detail URLs;
- no `/talks/archive/` URL and no query URL.

Compare expected listing and detail URL sets directly; do not classify every `/talks/*` URL as a detail because numbered listing routes now share that prefix.

Replace the old archive-page map in `sitemap.ts` with:

```ts
const totalListingPages = Math.max(
	1,
	Math.ceil(talks.length / TALK_LISTING_PAGE_SIZE),
);
const listingPages: MetadataRoute.Sitemap = Array.from(
	{ length: Math.max(0, totalListingPages - 1) },
	(_, index) => ({
		url: buildCanonicalUrl(buildTalksHref({ page: index + 2 })),
		changeFrequency: "weekly",
		priority: 0.5,
	}),
);

return [...staticPages, ...listingPages, ...talkPages];
```

- [ ] **Step 5: Run sitemap and redirect tests and verify GREEN**

```bash
set -euo pipefail
/Users/tt/.bun/bin/bun test \
  app/application/talk/archive-redirect.test.ts \
  'app/talks/archive/[page]/page.test.tsx' \
  app/sitemap.test.ts
```

Expected: all tests PASS with ten redirects and 31 canonical listing URLs.

- [ ] **Step 6: Remove the old archive model, format, and commit Task 6**

```bash
set -euo pipefail
git rm app/application/talk/archive.ts app/application/talk/archive.test.ts
/Users/tt/.bun/bin/bunx oxfmt \
  app/application/talk/archive-redirect.ts \
  app/application/talk/archive-redirect.test.ts \
  'app/talks/archive/[page]/page.tsx' \
  'app/talks/archive/[page]/page.test.tsx' \
  app/sitemap.ts \
  app/sitemap.test.ts
git diff --check
git add \
  app/application/talk/archive-redirect.ts \
  app/application/talk/archive-redirect.test.ts \
  'app/talks/archive/[page]/page.tsx' \
  'app/talks/archive/[page]/page.test.tsx' \
  app/sitemap.ts \
  app/sitemap.test.ts
git commit -m "feat: redirect legacy talk archive pages"
```

---

### Task 7: Remove the obsolete APIs, grouping, and Virtuoso state

**Files:**

- Delete the two APIs, browser gallery storage, and grouping files still listed in the File Map; Task 5 already removed the replaced client UI.
- Modify: `app/application/navigation/scroll-restoration.ts` and test.
- Modify: `app/infrastructure/browser/storage.ts` and test.
- Modify: `package.json` and `bun.lock`.

**Interfaces:**

- The only talk-listing implementation after this task is `TalkListing` plus the two server routes.
- `TalkGalleryCard` and `highlight.tsx` remain shared.

- [ ] **Step 1: Change the scroll-restoration test to normal page navigation**

The detail-to-root case now expects `true`, and add a detail-to-page-2 case that also expects `true`. Same-path query-only navigation remains `false`.

Run:

```bash
set -euo pipefail
/Users/tt/.bun/bin/bun test app/application/navigation/scroll-restoration.test.ts
```

Expected: FAIL because the old `/talks` exception still returns false.

- [ ] **Step 2: Remove the Virtuoso-only scroll exception**

Delete `isTalkDetailPath()` and the conditional exception. The function becomes:

```ts
export function shouldResetScrollOnRouteChange({
	pathname,
	previousPathname,
}: Params): boolean {
	return previousPathname !== null && pathname !== previousPathname;
}
```

Run the Step 1 command and expect PASS.

- [ ] **Step 3: Delete the remaining client delivery stack**

```bash
set -euo pipefail
git rm \
  app/api/talk-gallery/route.ts \
  app/api/talk-search/route.ts \
  app/infrastructure/browser/talk-gallery-storage.ts \
  app/application/talk/grouping.ts \
  app/application/talk/grouping.test.ts
```

Do not delete `search-api.ts` or `@libsql/client`; the preserved database search implementation still imports them.

- [ ] **Step 4: Remove Virtuoso snapshot helpers and dependency**

Remove the `StateSnapshot` import and `parseVirtuosoRestoreSnapshot()` from `storage.ts`, and remove the two snapshot tests while retaining the generic session/scroll-position helpers.

Then run:

```bash
set -euo pipefail
/Users/tt/.bun/bin/bun remove react-virtuoso
```

Expected: `package.json` and `bun.lock` no longer mention `react-virtuoso`.

- [ ] **Step 5: Prove no live client consumer remains**

Run:

```bash
set -euo pipefail
test ! -e app/api/talk-gallery/route.ts
test ! -e app/api/talk-search/route.ts
test ! -e app/components/talk-gallery.tsx
! rg -n \
  'react-virtuoso|GroupedVirtuoso|TalkGalleryLoader|useTalkGalleryData|buildVirtualGalleryData|talkGallery:' \
  app next.config.ts package.json bun.lock
! rg -n '/api/talk-gallery|/api/talk-search' app/components app/talks
```

Expected: every command exits 0 and prints no matches.

- [ ] **Step 6: Run focused regression tests**

```bash
set -euo pipefail
/Users/tt/.bun/bin/bun test \
  app/application/navigation/scroll-restoration.test.ts \
  app/infrastructure/browser/storage.test.ts \
  app/components/talk-listing.test.tsx \
  app/talks/page.test.tsx \
  'app/talks/page/[page]/page.test.tsx'
```

Expected: all retained tests PASS.

- [ ] **Step 7: Format and commit Task 7**

```bash
set -euo pipefail
/Users/tt/.bun/bin/bunx oxfmt \
  app/application/navigation/scroll-restoration.ts \
  app/application/navigation/scroll-restoration.test.ts \
  app/infrastructure/browser/storage.ts \
  app/infrastructure/browser/storage.test.ts \
  package.json
git diff --check
git add -A
git commit -m "refactor: remove virtual talk gallery"
```

---

### Task 8: Verify production output, integrate, deploy, and inspect live behavior

**Files:**

- Verify all changed files.
- Modify `next.config.ts` only if the built route keys differ from the declared keys; add the corresponding focused test before changing it.

- [ ] **Step 1: Run all repository gates**

```bash
set -euo pipefail
/Users/tt/.bun/bin/bun test
/Users/tt/.bun/bin/bun run format:check
/Users/tt/.bun/bin/bun run lint
/Users/tt/.bun/bin/bun run build
```

Expected: every command exits 0.

- [ ] **Step 2: Inspect both route traces and removed bundles**

```bash
set -euo pipefail
for trace in \
  .next/server/app/talks/page.js.nft.json \
  '.next/server/app/talks/page/[page]/page.js.nft.json'; do
  test -f "$trace"
  rg -q -F 'transcript-search-documents.json' "$trace"
done
rg -l -F \
  'transcript-search-documents.json' \
  .next/server/app \
  -g '*.nft.json' | sort
! rg -n \
  'react-virtuoso|GroupedVirtuoso|/api/talk-gallery' \
  .next/static/chunks .next/server/app/talks \
  -g '*.js'
```

Expected: both listing traces contain the generated search document, the old gallery API/client bundle is absent, and no numbered-page trace is missing the file.

- [ ] **Step 3: Start the local production build in a retained PTY**

Start this foreground process in a long-lived PTY, retain its session ID for the following steps, and wait until the terminal reports that the server is ready:

```bash
set -euo pipefail
PORT=3100 /Users/tt/.bun/bin/bun run start
```

Expected: the foreground server remains alive in the retained PTY and reports no startup error. Do not background it from a short-lived shell; Steps 4 and 5 run in separate commands against the retained process.

- [ ] **Step 4: Verify local pages and measure cold/warm search**

Count only the literal server-rendered opening tag. A bare `data-talk-gallery-item` count is invalid because the Next.js Flight payload also serializes that prop:

```bash
set -euo pipefail
test "$(curl -fsS 'http://127.0.0.1:3100/talks' | rg -o '<div data-talk-gallery-item="true"' | wc -l | tr -d ' ')" = "30"
test "$(curl -fsS 'http://127.0.0.1:3100/talks/page/2' | rg -o '<div data-talk-gallery-item="true"' | wc -l | tr -d ' ')" = "30"
test "$(curl -fsS 'http://127.0.0.1:3100/talks/page/31' | rg -o '<div data-talk-gallery-item="true"' | wc -l | tr -d ' ')" = "1"
curl -fsS 'http://127.0.0.1:3100/talks' | rg -F 'aria-label="法話を検索"'
curl -fsS 'http://127.0.0.1:3100/talks/page/2' | rg -F 'rel="canonical"'
curl -fsSG --data-urlencode 'collection=monthly_talk' 'http://127.0.0.1:3100/talks' | rg -F 'noindex, follow'
curl -fsSG --data-urlencode 'collection=monthly_talk' 'http://127.0.0.1:3100/talks' | rg -F 'value="monthly_talk"'
```

The process is still fresh and the preceding requests had no query. Treat the next request as the local search cold-start measurement, then measure the same query warm and page 2 against the already-loaded read model:

```bash
set -euo pipefail
TASK_LOCAL_SEARCH_ONE=$(mktemp)
TASK_LOCAL_SEARCH_TWO=$(mktemp)
trap 'rm -f "$TASK_LOCAL_SEARCH_ONE" "$TASK_LOCAL_SEARCH_TWO"' EXIT
curl --compressed -fsSG \
  --data-urlencode 'query=仏教' \
  -o "$TASK_LOCAL_SEARCH_ONE" \
  -w 'local_search_cold ttfb=%{time_starttransfer} total=%{time_total} transfer_bytes=%{size_download}\n' \
  'http://127.0.0.1:3100/talks'
curl --compressed -fsSG \
  --data-urlencode 'query=仏教' \
  -o /dev/null \
  -w 'local_search_warm ttfb=%{time_starttransfer} total=%{time_total} transfer_bytes=%{size_download}\n' \
  'http://127.0.0.1:3100/talks'
curl --compressed -fsSG \
  --data-urlencode 'query=仏教' \
  -o "$TASK_LOCAL_SEARCH_TWO" \
  -w 'local_search_page2 ttfb=%{time_starttransfer} total=%{time_total} transfer_bytes=%{size_download}\n' \
  'http://127.0.0.1:3100/talks/page/2'
rg -F '全880件中 1〜30件' "$TASK_LOCAL_SEARCH_ONE"
rg -F '全880件中 31〜60件' "$TASK_LOCAL_SEARCH_TWO"
rg -F 'noindex, follow' "$TASK_LOCAL_SEARCH_ONE"
rg -F 'transcript-cue-' "$TASK_LOCAL_SEARCH_TWO"
rg -F 'galleryPage=2' "$TASK_LOCAL_SEARCH_TWO"
rm "$TASK_LOCAL_SEARCH_ONE" "$TASK_LOCAL_SEARCH_TWO"
trap - EXIT
```

The generated data is explicitly out of scope, so `仏教` remains the verified 880-match fixture. If that count differs, stop and determine whether data changed unexpectedly instead of weakening the assertion.

Check status and redirect targets:

```bash
set -euo pipefail
test "$(curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' 'http://127.0.0.1:3100/talks/page/1?query=%E6%85%88%E6%82%B2&collection=monthly_talk')" = '308 http://127.0.0.1:3100/talks?query=%E6%85%88%E6%82%B2&collection=monthly_talk'
test "$(curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' 'http://127.0.0.1:3100/talks/archive/2')" = '308 http://127.0.0.1:3100/talks/page/4'
test "$(curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' 'http://127.0.0.1:3100/talks/archive/10')" = '308 http://127.0.0.1:3100/talks/page/31'
for path in talks/page/0 talks/page/02 talks/page/2.0 talks/page/32 talks/archive/11 api/talk-gallery api/talk-search; do
  test "$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:3100/$path")" = "404"
done
```

Expected: page 1 is 308 to filtered `/talks`, archives 2 and 10 are 308 to pages 4 and 31, and every invalid/removed path is 404.

- [ ] **Step 5: Verify local HTML/RSC sizes and every sitemap listing URL**

Measure both the uncompressed representation and compressed transfer bytes. Request the App Router payload explicitly with `RSC: 1`, prove its content type, and prove it contains only the 30 current-page card props:

```bash
set -euo pipefail
TASK_LOCAL_RSC=$(mktemp)
TASK_LOCAL_RSC_HEADERS=$(mktemp)
TASK_LOCAL_HTML=$(mktemp)
trap 'rm -f "$TASK_LOCAL_RSC" "$TASK_LOCAL_RSC_HEADERS" "$TASK_LOCAL_HTML"' EXIT
curl -fsS \
  -D "$TASK_LOCAL_RSC_HEADERS" \
  -H 'RSC: 1' \
  -o "$TASK_LOCAL_RSC" \
  'http://127.0.0.1:3100/talks'
rg -i '^content-type: *text/x-component' "$TASK_LOCAL_RSC_HEADERS"
test "$(rg -o 'data-talk-gallery-item' "$TASK_LOCAL_RSC" | wc -l | tr -d ' ')" = "30"
curl -fsS \
  -o /dev/null \
  -w 'local_html_uncompressed_bytes=%{size_download}\n' \
  'http://127.0.0.1:3100/talks'
curl --compressed -fsS \
  -o /dev/null \
  -w 'local_html_transfer_bytes=%{size_download}\n' \
  'http://127.0.0.1:3100/talks'
curl -fsS \
  -H 'RSC: 1' \
  -o /dev/null \
  -w 'local_rsc_uncompressed_bytes=%{size_download}\n' \
  'http://127.0.0.1:3100/talks'
curl --compressed -fsS \
  -H 'RSC: 1' \
  -o /dev/null \
  -w 'local_rsc_transfer_bytes=%{size_download}\n' \
  'http://127.0.0.1:3100/talks'
curl -fsS -o "$TASK_LOCAL_HTML" 'http://127.0.0.1:3100/talks'
test "$(wc -c <"$TASK_LOCAL_HTML" | tr -d ' ')" -lt 600000
rm "$TASK_LOCAL_RSC" "$TASK_LOCAL_RSC_HEADERS" "$TASK_LOCAL_HTML"
trap - EXIT
```

The 600 KB limit is a regression guard, not a claim that 30 rich cards must be smaller than the previous six-card HTML. The removed 1.31 MB gallery JSON must no longer be requested or exposed.

Verify that the sitemap contains exactly the 31 canonical listing URLs and that every one returns 200:

```bash
set -euo pipefail
TASK_LOCAL_SITEMAP=$(mktemp)
TASK_LOCAL_LISTING_URLS=$(mktemp)
trap 'rm -f "$TASK_LOCAL_SITEMAP" "$TASK_LOCAL_LISTING_URLS"' EXIT
curl -fsS 'http://127.0.0.1:3100/sitemap.xml' >"$TASK_LOCAL_SITEMAP"
rg -o '<loc>https://early-buddhism\.j-theravada\.com/talks(?:/page/[0-9]+)?</loc>' \
  "$TASK_LOCAL_SITEMAP" \
  | sed -E 's#</?loc>##g' \
  | sort -u >"$TASK_LOCAL_LISTING_URLS"
test "$(wc -l <"$TASK_LOCAL_LISTING_URLS" | tr -d ' ')" = "31"
! rg -F '/talks/archive/' "$TASK_LOCAL_SITEMAP"
while IFS= read -r production_url; do
  local_path=${production_url#https://early-buddhism.j-theravada.com}
  test "$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:3100$local_path")" = "200"
done <"$TASK_LOCAL_LISTING_URLS"
rm "$TASK_LOCAL_SITEMAP" "$TASK_LOCAL_LISTING_URLS"
trap - EXIT
```

Record all four size values and all three timing values in the implementation handoff. There is no invented absolute TTFB threshold: failures, timeouts, a large cold/warm regression, or page 2 unexpectedly reloading the read model block deployment and require profiling the match/snippet split, lazy load, cache, and route trace before any database architecture change.

After every local HTTP assertion passes, send Ctrl-C to the retained Step 3 PTY and confirm that the server exits.

- [ ] **Step 6: Review the implementation before integration**

Invoke `superpowers:requesting-code-review`. Address all correctness findings, rerun the focused tests for touched files, then rerun the four repository gates from Step 1.

- [ ] **Step 7: Integrate the worktree into main**

Invoke `superpowers:finishing-a-development-branch`. Because the user explicitly requested main deployment, choose the verified main-integration path, confirm main contains the design and implementation commits, and confirm:

```bash
set -euo pipefail
test "$(git branch --show-current)" = "main"
test -z "$(git status --porcelain)"
git status --short --branch
git log --oneline --decorate -10
```

Expected: main is clean and ahead of `origin/main` only by the intended commits. Manually compare the displayed commit list with the task commits before continuing.

- [ ] **Step 8: Capture the old production baseline before pushing**

The public alias still serves the old release at this point. Record its root HTML/RSC transfer sizes and the old search API's observed first/repeat timings in a task-specific temporary evidence file:

```bash
set -euo pipefail
curl --compressed -fsS \
  -o /dev/null \
  -w 'old_prod_html transfer_bytes=%{size_download} ttfb=%{time_starttransfer} total=%{time_total}\n' \
  'https://early-buddhism.j-theravada.com/talks' \
  | tee /tmp/early-buddhism-talks-predeploy-metrics.txt
curl --compressed -fsS \
  -H 'RSC: 1' \
  -o /dev/null \
  -w 'old_prod_rsc transfer_bytes=%{size_download} ttfb=%{time_starttransfer} total=%{time_total}\n' \
  'https://early-buddhism.j-theravada.com/talks' \
  | tee -a /tmp/early-buddhism-talks-predeploy-metrics.txt
curl --compressed -fsSG \
  --data-urlencode 'query=仏教' \
  -o /dev/null \
  -w 'old_prod_search_first_observed transfer_bytes=%{size_download} ttfb=%{time_starttransfer} total=%{time_total}\n' \
  'https://early-buddhism.j-theravada.com/api/talk-search' \
  | tee -a /tmp/early-buddhism-talks-predeploy-metrics.txt
curl --compressed -fsSG \
  --data-urlencode 'query=仏教' \
  -o /dev/null \
  -w 'old_prod_search_repeat transfer_bytes=%{size_download} ttfb=%{time_starttransfer} total=%{time_total}\n' \
  'https://early-buddhism.j-theravada.com/api/talk-search' \
  | tee -a /tmp/early-buddhism-talks-predeploy-metrics.txt
```

This is an observed pre-deploy baseline, not a guaranteed platform cold start. Preserve and report it next to the post-deploy measurements.

- [ ] **Step 9: Push main and wait for the production release**

```bash
set -euo pipefail
git push origin main
```

Poll the production alias in short intervals until all three distinguishing probes match the new release:

```bash
set -euo pipefail
test "$(curl -sS -o /dev/null -w '%{http_code}' 'https://early-buddhism.j-theravada.com/talks/page/31')" = "200"
test "$(curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' 'https://early-buddhism.j-theravada.com/talks/archive/2')" = "308 https://early-buddhism.j-theravada.com/talks/page/4"
test "$(curl -sS -o /dev/null -w '%{http_code}' 'https://early-buddhism.j-theravada.com/api/talk-gallery')" = "404"
```

Expected: 200, 308 to `/talks/page/4`, and 404.

- [ ] **Step 10: Verify production HTTP, all sitemap pages, redirects, and performance**

Repeat the exact local DOM, search-range, metadata, detail-return, RSC-content-type, and 30/30/1 card assertions against the production hostname. Then record the production metrics:

```bash
set -euo pipefail
PROD_TALKS_HOST='https://early-buddhism.j-theravada.com'
curl --compressed -fsS \
  -o /dev/null \
  -w 'new_prod_html transfer_bytes=%{size_download} ttfb=%{time_starttransfer} total=%{time_total}\n' \
  "$PROD_TALKS_HOST/talks" \
  | tee /tmp/early-buddhism-talks-postdeploy-metrics.txt
curl --compressed -fsS \
  -H 'RSC: 1' \
  -o /dev/null \
  -w 'new_prod_rsc transfer_bytes=%{size_download} ttfb=%{time_starttransfer} total=%{time_total}\n' \
  "$PROD_TALKS_HOST/talks" \
  | tee -a /tmp/early-buddhism-talks-postdeploy-metrics.txt
curl --compressed -fsSG \
  --data-urlencode 'query=仏教' \
  -o /dev/null \
  -w 'new_prod_search_first_observed transfer_bytes=%{size_download} ttfb=%{time_starttransfer} total=%{time_total}\n' \
  "$PROD_TALKS_HOST/talks" \
  | tee -a /tmp/early-buddhism-talks-postdeploy-metrics.txt
curl --compressed -fsSG \
  --data-urlencode 'query=仏教' \
  -o /dev/null \
  -w 'new_prod_search_repeat transfer_bytes=%{size_download} ttfb=%{time_starttransfer} total=%{time_total}\n' \
  "$PROD_TALKS_HOST/talks" \
  | tee -a /tmp/early-buddhism-talks-postdeploy-metrics.txt
curl --compressed -fsSG \
  --data-urlencode 'query=仏教' \
  -o /dev/null \
  -w 'new_prod_search_page2 transfer_bytes=%{size_download} ttfb=%{time_starttransfer} total=%{time_total}\n' \
  "$PROD_TALKS_HOST/talks/page/2" \
  | tee -a /tmp/early-buddhism-talks-postdeploy-metrics.txt
```

The first post-deploy search is a cold-start proxy only; state that caveat in the report. Compare both metric files and confirm the new 30-card initial document plus RSC are bounded, the 1.31 MB client-gallery response is gone, the instrumented tests prove the ID-cache hit, and the observed page-2 timing does not indicate a fresh read-model load. Treat timing noise as evidence to investigate, not as proof that the cache contract failed.

Run the concrete production rendering and metadata assertions after the first-observed timing has been captured:

```bash
set -euo pipefail
PROD_TALKS_HOST='https://early-buddhism.j-theravada.com'
test "$(curl -fsS "$PROD_TALKS_HOST/talks" | rg -o '<div data-talk-gallery-item="true"' | wc -l | tr -d ' ')" = "30"
test "$(curl -fsS "$PROD_TALKS_HOST/talks/page/2" | rg -o '<div data-talk-gallery-item="true"' | wc -l | tr -d ' ')" = "30"
test "$(curl -fsS "$PROD_TALKS_HOST/talks/page/31" | rg -o '<div data-talk-gallery-item="true"' | wc -l | tr -d ' ')" = "1"
curl -fsS "$PROD_TALKS_HOST/talks" | rg -F 'aria-label="法話を検索"'
curl -fsS "$PROD_TALKS_HOST/talks/page/2" | rg -F 'rel="canonical"'
TASK_PROD_SEARCH_ONE=$(mktemp)
TASK_PROD_SEARCH_TWO=$(mktemp)
TASK_PROD_RSC_HEADERS=$(mktemp)
TASK_PROD_RSC=$(mktemp)
trap 'rm -f "$TASK_PROD_SEARCH_ONE" "$TASK_PROD_SEARCH_TWO" "$TASK_PROD_RSC_HEADERS" "$TASK_PROD_RSC"' EXIT
curl -fsSG --data-urlencode 'query=仏教' "$PROD_TALKS_HOST/talks" >"$TASK_PROD_SEARCH_ONE"
curl -fsSG --data-urlencode 'query=仏教' "$PROD_TALKS_HOST/talks/page/2" >"$TASK_PROD_SEARCH_TWO"
rg -F '全880件中 1〜30件' "$TASK_PROD_SEARCH_ONE"
rg -F '全880件中 31〜60件' "$TASK_PROD_SEARCH_TWO"
rg -F 'noindex, follow' "$TASK_PROD_SEARCH_ONE"
rg -F 'transcript-cue-' "$TASK_PROD_SEARCH_TWO"
rg -F 'galleryPage=2' "$TASK_PROD_SEARCH_TWO"
curl -fsS -D "$TASK_PROD_RSC_HEADERS" -H 'RSC: 1' -o "$TASK_PROD_RSC" "$PROD_TALKS_HOST/talks"
rg -i '^content-type: *text/x-component' "$TASK_PROD_RSC_HEADERS"
test "$(rg -o 'data-talk-gallery-item' "$TASK_PROD_RSC" | wc -l | tr -d ' ')" = "30"
curl -fsSG --data-urlencode 'collection=monthly_talk' "$PROD_TALKS_HOST/talks" | rg -F 'noindex, follow'
rm "$TASK_PROD_SEARCH_ONE" "$TASK_PROD_SEARCH_TWO" "$TASK_PROD_RSC_HEADERS" "$TASK_PROD_RSC"
trap - EXIT
```

Fetch the production sitemap and require every listing URL to return 200:

```bash
set -euo pipefail
PROD_TALKS_HOST='https://early-buddhism.j-theravada.com'
TASK_PROD_SITEMAP=$(mktemp)
TASK_PROD_LISTING_URLS=$(mktemp)
trap 'rm -f "$TASK_PROD_SITEMAP" "$TASK_PROD_LISTING_URLS"' EXIT
curl -fsS "$PROD_TALKS_HOST/sitemap.xml" >"$TASK_PROD_SITEMAP"
rg -o '<loc>https://early-buddhism\.j-theravada\.com/talks(?:/page/[0-9]+)?</loc>' \
  "$TASK_PROD_SITEMAP" \
  | sed -E 's#</?loc>##g' \
  | sort -u >"$TASK_PROD_LISTING_URLS"
test "$(wc -l <"$TASK_PROD_LISTING_URLS" | tr -d ' ')" = "31"
while IFS= read -r listing_url; do
  test "$(curl -sS -o /dev/null -w '%{http_code}' "$listing_url")" = "200"
done <"$TASK_PROD_LISTING_URLS"
! rg -F '/talks/archive/' "$TASK_PROD_SITEMAP"
rm "$TASK_PROD_SITEMAP" "$TASK_PROD_LISTING_URLS"
trap - EXIT
```

Require all ten legacy mappings, the page-1 query-preserving redirect, and removed APIs:

```bash
set -euo pipefail
PROD_TALKS_HOST='https://early-buddhism.j-theravada.com'
while IFS=' ' read -r archive_page target_path; do
  test "$(curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' "$PROD_TALKS_HOST/talks/archive/$archive_page")" = "308 $PROD_TALKS_HOST$target_path"
done <<'MAPPINGS'
1 /talks
2 /talks/page/4
3 /talks/page/7
4 /talks/page/11
5 /talks/page/14
6 /talks/page/17
7 /talks/page/21
8 /talks/page/24
9 /talks/page/27
10 /talks/page/31
MAPPINGS
test "$(curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' "$PROD_TALKS_HOST/talks/page/1?query=%E6%85%88%E6%82%B2&collection=monthly_talk")" = "308 $PROD_TALKS_HOST/talks?query=%E6%85%88%E6%82%B2&collection=monthly_talk"
test "$(curl -sS -o /dev/null -w '%{http_code}' "$PROD_TALKS_HOST/api/talk-gallery")" = "404"
test "$(curl -sS -o /dev/null -w '%{http_code}' "$PROD_TALKS_HOST/api/talk-search")" = "404"
```

- [ ] **Step 11: Verify the deployed flow in real browsers with JavaScript on and off**

Invoke `browser:control-in-app-browser` and inspect the live site at desktop 1440×900 and mobile 390×844 widths with JavaScript enabled:

1. start on the homepage and activate the header's `動画一覧` link;
2. without scrolling, prove the search input and submit button are inside the initial viewport and capture each width;
3. search for `仏教`, open page 2, select `月例講演会`, open a detail/cue, and use the detail back link;
4. at every transition, compare the visible cards and URL's page/query/collection/series state.

The original regression was visual and mobile-specific, so HTML input presence alone is not acceptance evidence.

Use the installed Chrome binary as a second real-browser check with JavaScript disabled. Dump both widths, compare their unique detail-ID sets with JavaScript enabled, and exercise the page-2 search URL:

```bash
set -euo pipefail
TASK_LIVE_BROWSER_TMP=$(mktemp -d /tmp/early-buddhism-live-browser.XXXXXX)
TASK_CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
trap 'rm -rf -- "$TASK_LIVE_BROWSER_TMP"' EXIT
test -x "$TASK_CHROME"
"$TASK_CHROME" --headless=new --disable-gpu --no-first-run \
  --user-data-dir="$TASK_LIVE_BROWSER_TMP/desktop-js-profile" \
  --window-size=1440,900 --dump-dom \
  'https://early-buddhism.j-theravada.com/talks' \
  >"$TASK_LIVE_BROWSER_TMP/desktop-js.html"
"$TASK_CHROME" --headless=new --disable-gpu --no-first-run \
  --user-data-dir="$TASK_LIVE_BROWSER_TMP/mobile-js-profile" \
  --window-size=390,844 --dump-dom \
  'https://early-buddhism.j-theravada.com/talks' \
  >"$TASK_LIVE_BROWSER_TMP/mobile-js.html"
"$TASK_CHROME" --headless=new --disable-gpu --no-first-run \
  --blink-settings=scriptEnabled=false \
  --user-data-dir="$TASK_LIVE_BROWSER_TMP/desktop-nojs-profile" \
  --window-size=1440,900 --dump-dom \
  'https://early-buddhism.j-theravada.com/talks' \
  >"$TASK_LIVE_BROWSER_TMP/desktop-nojs.html"
"$TASK_CHROME" --headless=new --disable-gpu --no-first-run \
  --blink-settings=scriptEnabled=false \
  --user-data-dir="$TASK_LIVE_BROWSER_TMP/mobile-nojs-profile" \
  --window-size=390,844 --dump-dom \
  'https://early-buddhism.j-theravada.com/talks' \
  >"$TASK_LIVE_BROWSER_TMP/mobile-nojs.html"
for mode in desktop-js mobile-js desktop-nojs mobile-nojs; do
  rg -o 'href="/talks/[^"]+"' "$TASK_LIVE_BROWSER_TMP/$mode.html" \
    | sed -E 's/^href="//; s/"$//; s/[?#].*$//' \
    | rg -v '^/talks/(page|archive)/' \
    | sort -u >"$TASK_LIVE_BROWSER_TMP/$mode.ids"
  test "$(wc -l <"$TASK_LIVE_BROWSER_TMP/$mode.ids" | tr -d ' ')" = "30"
done
cmp "$TASK_LIVE_BROWSER_TMP/desktop-js.ids" "$TASK_LIVE_BROWSER_TMP/desktop-nojs.ids"
cmp "$TASK_LIVE_BROWSER_TMP/mobile-js.ids" "$TASK_LIVE_BROWSER_TMP/mobile-nojs.ids"
"$TASK_CHROME" --headless=new --disable-gpu --no-first-run \
  --blink-settings=scriptEnabled=false \
  --user-data-dir="$TASK_LIVE_BROWSER_TMP/search-nojs-profile" \
  --window-size=390,844 --dump-dom \
  'https://early-buddhism.j-theravada.com/talks/page/2?query=%E4%BB%8F%E6%95%99' \
  >"$TASK_LIVE_BROWSER_TMP/search-page2-nojs.html"
rg -F '全880件中 31〜60件' "$TASK_LIVE_BROWSER_TMP/search-page2-nojs.html"
rg -F 'galleryPage=2' "$TASK_LIVE_BROWSER_TMP/search-page2-nojs.html"
test -d "$TASK_LIVE_BROWSER_TMP"
rm -rf -- "$TASK_LIVE_BROWSER_TMP"
trap - EXIT
```

Do not report completion until the visual browser flow, JavaScript-disabled set comparison, HTTP assertions, and measured performance evidence all pass.

---

## Final Acceptance Checklist

- `/talks` shows its search field immediately and contains 30 server-rendered cards.
- Search and filters are GET navigation and work without client gallery JavaScript.
- Page 2 and later preserve conditions and render only their 30-item slice.
- Queryless requests do not invoke transcript search dependencies.
- Search result IDs are cached, and snippets exist only for visible cards.
- Detail and cue links return to the exact page and filters.
- Decade links and page sections preserve newest-first source order.
- Every unfiltered listing page is self-canonical and present once in the sitemap.
- Every filtered page is noindex and absent from the sitemap.
- Legacy archive URLs permanently redirect near their previous offsets.
- Both listing route traces contain the transcript search document.
- The old APIs, Virtuoso client bundle, dependency, and storage state are gone.
- Local and production HTML/RSC transfer sizes plus cold/repeat/page-2 search timings are measured and reported with the cold-start caveat.
- All 31 production sitemap listing URLs return 200, and every legacy archive mapping returns its intended 308.
- Desktop and mobile real-browser checks show the search controls immediately; JavaScript-enabled and disabled browsers reach the same talk sets.
- Main, Vercel production, and the public alias all serve the verified behavior.
