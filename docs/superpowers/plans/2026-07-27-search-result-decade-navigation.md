# Search Result Decade Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 検索・分類で絞り込んだ動画一覧にも、検索条件を保つ年代ナビを表示する。

**Architecture:** 一覧モデルは絞り込み後の全結果から年代別の件数と先頭ページを計算する。表示層は現在の一覧条件を年代ナビへ渡し、既存の `buildTalksHref()` で条件付きリンクを生成する。

**Tech Stack:** TypeScript、React Server Components、Next.js 16、Bun test

## Global Constraints

- `/talks` は `recordedOnDate` の古い順を維持し、日付がない動画は末尾に置く。
- 検索、分類、ページングでも既存の並び順を変更しない。
- 年代リンクは検索語、検索対象、分類、シリーズを維持する。
- 検索API、検索アルゴリズム、ページサイズ、年代ナビの見た目は変更しない。
- 既存の未追跡文字起こしファイルは変更・ステージしない。

---

### Task 1: 検索結果に年代ナビを追加する

**Files:**

- Modify: `app/application/talk/listing.ts:209-264`
- Modify: `app/components/talk-gallery/decade-jump-nav.tsx:1-32`
- Modify: `app/components/talk-listing.tsx:248`
- Test: `app/application/talk/listing.test.ts`
- Test: `app/components/talk-listing.test.tsx`

**Interfaces:**

- Consumes: `TalkListingConditions`、`TalkListingDecadeTarget[]`、`buildTalksHref(options: TalkGalleryHrefOptions): string`
- Produces: 絞り込み後の `TalkListingPage.decadeTargets` と、検索条件を維持する年代リンク

- [ ] **Step 1: 一覧モデルの失敗するテストを書く**

`app/application/talk/listing.test.ts` に、検索一致した32件だけを年代別に集計するテストを追加する。

```ts
test("検索結果全体から年代別の件数と先頭ページを作る", () => {
	const items = [
		...Array.from({ length: 31 }, (_, index) =>
			createItem(index + 1, { decadeLabel: "2000年代" }),
		),
		createItem(32, { decadeLabel: "2010年代" }),
		createItem(33, { decadeLabel: "2020年代" }),
	];
	const normalized = normalizeTalkListingRequest(items, {
		page: "1",
		query: "慈悲",
	});
	const matched = items.slice(0, 32).map((item) => item.id);

	expect(
		buildTalkListingPage(items, normalized!, matched)?.decadeTargets,
	).toEqual([
		{
			label: "2000年代",
			count: 31,
			page: 1,
			anchorId: "talk-decade-2000",
		},
		{
			label: "2010年代",
			count: 1,
			page: 2,
			anchorId: "talk-decade-2010",
		},
	]);
});
```

- [ ] **Step 2: 一覧モデルテストが期待どおり失敗することを確認する**

Run: `bun test app/application/talk/listing.test.ts`

Expected: 新しいテストが `received []` で失敗する。

- [ ] **Step 3: 絞り込み後の結果から年代ターゲットを作る**

`app/application/talk/listing.ts` の条件有無による非表示分岐を削除し、返却値を次のようにする。

```ts
decadeTargets: buildDecadeTargets(filteredItems),
```

- [ ] **Step 4: 一覧モデルテストが通ることを確認する**

Run: `bun test app/application/talk/listing.test.ts`

Expected: 全テストがPASSする。

- [ ] **Step 5: 年代リンクの失敗するテストを書く**

`app/components/talk-listing.test.tsx` に、検索対象を限定した検索・分類条件が年代リンクへ残るテストを追加する。

```tsx
test("検索時の年代リンクに現在の検索条件を引き継ぐ", () => {
	const html = renderToStaticMarkup(
		<TalkListing
			listing={createListing({
				conditions: {
					query: "仏教",
					collectionId: "scripture_commentary",
					seriesId: "abhidhamma",
					searchFields: ["title", "transcript"],
				},
				decadeTargets: [
					{
						label: "2000年代",
						count: 31,
						page: 2,
						anchorId: "talk-decade-2000",
					},
					{
						label: "2010年代",
						count: 1,
						page: 3,
						anchorId: "talk-decade-2010",
					},
				],
			})}
		/>,
	);

	expect(html).toContain(
		'href="/talks/page/2?query=%E4%BB%8F%E6%95%99&amp;collection=scripture_commentary&amp;series=abhidhamma&amp;fields=title&amp;fields=transcript#talk-decade-2000"',
	);
});
```

- [ ] **Step 6: 年代リンクテストが期待どおり失敗することを確認する**

Run: `bun test app/components/talk-listing.test.tsx`

Expected: 年代リンクが `/talks/page/2#talk-decade-2000` のため失敗する。

- [ ] **Step 7: 年代ナビへ現在の検索条件を渡す**

`DecadeJumpNav` は `TalkListingConditions` を受け取り、リンクを次のように生成する。

```tsx
type Props = {
	conditions: TalkListingConditions;
	targets: TalkListingDecadeTarget[];
};

href={`${buildTalksHref({
	page: target.page,
	query: conditions.query,
	collectionId: conditions.collectionId,
	seriesId: conditions.seriesId,
	searchFields: conditions.searchFields,
})}#${target.anchorId}`}
```

`TalkListing` の呼び出しは次のように変更する。

```tsx
<DecadeJumpNav conditions={conditions} targets={listing.decadeTargets} />
```

- [ ] **Step 8: 対象テストを通す**

Run: `bun test app/application/talk/listing.test.ts app/components/talk-listing.test.tsx`

Expected: 全テストがPASSする。

- [ ] **Step 9: 全体検証を行う**

Run:

```bash
bun test
bun run format:check
bun run lint
bun run build
```

Expected: すべて終了コード0。動画一覧の順序に関する既存回帰テストを含め、失敗がない。

- [ ] **Step 10: 今回の変更だけをコミットする**

```bash
git add \
  app/application/talk/listing.ts \
  app/application/talk/listing.test.ts \
  app/components/talk-gallery/decade-jump-nav.tsx \
  app/components/talk-listing.tsx \
  app/components/talk-listing.test.tsx \
  docs/superpowers/specs/2026-07-27-search-result-decade-navigation-design.md \
  docs/superpowers/plans/2026-07-27-search-result-decade-navigation.md
git commit -m "feat: add decade navigation to search results"
```
