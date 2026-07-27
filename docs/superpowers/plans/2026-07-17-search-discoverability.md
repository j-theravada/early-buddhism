# Search Discoverability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each talk's full transcript, every talk link, and the site's official publisher relationship available in crawlable server-rendered HTML without regressing the current gallery and timeline experience.

**Architecture:** Talk detail pages server-render a compact paragraph transcript and fetch cue-level timeline data only when requested. A statically generated, paginated archive provides ordinary links to every talk, and `/talks` links directly to every archive page so each talk is reachable within two clicks while the virtualized gallery remains unchanged. Shared JSON-LD helpers identify 日本テーラワーダ仏教協会 as the publisher of the 初期仏教塾 website and each video.

**Tech Stack:** Next.js 16 App Router, React 19 Server/Client Components, TypeScript 5.9, Bun test, oxfmt, oxlint.

## Global Constraints

- Do not create collection-specific landing pages, including a monthly-talk landing page.
- Do not change `/api/talk-search`, transcript generation, or Japanese query tokenization.
- Keep `GET /api/transcripts/[id]` URL and response shape compatible.
- Keep the current `/talks` search, filters, API loading, and `react-virtuoso` gallery behavior.
- Do not expose audio search in copy; public talk audio links are intentionally absent.
- Initial talk-detail HTML must contain the full compact transcript without passing the full cue array to a Client Component prop.
- Use test-first red-green-refactor for every production behavior change.
- Use `/Users/tt/.bun/bin/bun` explicitly because Bun is not on the non-interactive shell `PATH`.
- Do not push or deploy as part of this plan. Production Search Console follow-up happens only after a separately authorized deployment.

---

## File Map

### Create

- `app/application/seo/site-identity.ts` — canonical WebSite/Organization JSON-LD and publisher reference.
- `app/application/seo/site-identity.test.ts` — identity graph contract.
- `app/application/talk/archive.ts` — pure pagination logic for the crawlable talk archive.
- `app/application/talk/archive.test.ts` — archive completeness and boundary tests.
- `app/talks/archive/[page]/page.tsx` — static, self-canonical archive pages.
- `app/talks/archive/[page]/page.test.tsx` — archive route rendering and metadata tests.
- `app/talks/page.test.tsx` — rendered-link graph regression for the six-item preview and two-click reachability through every archive page.
- `app/sitemap.test.ts` — archive and detail URL coverage.
- `app/components/transcript-readable.tsx` — compact Server Component transcript paragraphs.
- `app/components/transcript-readable.test.tsx` — compact transcript markup tests.
- `app/components/transcript-section-loader.test.tsx` — initial mode, fallback, and timeline-load presentation tests.
- `app/components/transcript-section-loader.client.test.tsx` — mounted React-effect coverage for on-demand fetch, caching, retry, abort, and deep-link prop synchronization.
- `app/components/footer.test.tsx` — visible operator-label test.
- `app/about/page.test.tsx` — visible archive/operator copy test.

### Modify

- `app/layout.tsx` — shared description and site identity JSON-LD.
- `app/application/talk/detail.ts` — VideoObject publisher.
- `app/application/talk/detail.test.ts` — publisher regression assertion.
- `app/about/page.tsx` — explicit operator/archive copy.
- `app/components/footer.tsx` — visible `運営：` label.
- `app/application/talk/links.ts` — archive URL builder.
- `app/application/talk/links.test.ts` — archive URL builder test.
- `app/talks/page.tsx` — existing archive entry plus compact ordinary links to every archive page.
- `app/sitemap.ts` — include all archive page URLs.
- `app/talks/[id]/page.tsx` — read and render generated transcript server-side.
- `app/talks/[id]/page.test.tsx` — full-text initial HTML and missing-transcript tests.
- `app/components/transcript-section-loader.tsx` — readable/timeline mode shell and on-demand API fetch.
- `app/components/transcript-section.tsx` — cue timeline only; no mode or paragraph responsibility.
- `app/components/transcript-section.test.tsx` — timeline-only contract.
- `package.json` — dev-only `happy-dom` dependency used by mounted client-effect tests.
- `bun.lock` — lockfile update for the dev-only DOM test dependency.

---

### Task 1: Declare the official website publisher consistently

**Files:**

- Create: `app/application/seo/site-identity.ts`
- Create: `app/application/seo/site-identity.test.ts`
- Create: `app/components/footer.test.tsx`
- Create: `app/about/page.test.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/application/talk/detail.ts`
- Modify: `app/application/talk/detail.test.ts`
- Modify: `app/about/page.tsx`
- Modify: `app/components/footer.tsx`

**Interfaces:**

- Produces: `SITE_DESCRIPTION: string`
- Produces: `ASSOCIATION_ORGANIZATION_ID: string`
- Produces: `PublisherReference = { "@id": string }`
- Produces: `buildPublisherReference(): PublisherReference`
- Produces: `buildSiteIdentityJsonLd(): SiteIdentityJsonLd`
- Consumes: `SITE_NAME`, `SITE_URL`, and `buildCanonicalUrl()` from `app/utils/seo.ts`

- [ ] **Step 1: Write failing identity, publisher, and visible-copy tests**

Create `app/application/seo/site-identity.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import {
	ASSOCIATION_ORGANIZATION_ID,
	buildPublisherReference,
	buildSiteIdentityJsonLd,
	SITE_DESCRIPTION,
} from "./site-identity";

describe("site identity structured data", () => {
	test("初期仏教塾と運営組織を別エンティティとして結ぶ", () => {
		const result = buildSiteIdentityJsonLd();
		const website = result["@graph"][0];
		const organization = result["@graph"][1];

		expect(website.name).toBe("初期仏教塾");
		expect(website.publisher).toEqual({
			"@id": ASSOCIATION_ORGANIZATION_ID,
		});
		expect(organization["@id"]).toBe(ASSOCIATION_ORGANIZATION_ID);
		expect(organization.name).toBe("日本テーラワーダ仏教協会");
		expect(organization.legalName).toBe("宗教法人日本テーラワーダ仏教協会");
		expect(organization.name).not.toBe("初期仏教塾");
		expect(organization.logo).toMatchObject({ width: 512, height: 512 });
	});

	test("共通説明とpublisher参照を一か所から返す", () => {
		expect(SITE_DESCRIPTION).toContain("日本テーラワーダ仏教協会が運営");
		expect(SITE_DESCRIPTION).toContain("動画と文字起こし");
		expect(SITE_DESCRIPTION).not.toContain("音声");
		expect(buildPublisherReference()).toEqual({
			"@id": ASSOCIATION_ORGANIZATION_ID,
		});
	});
});
```

Add this assertion to the `詳細ページ用データを組み立てる` test in `app/application/talk/detail.test.ts`:

```ts
expect(result.videoJsonLd?.publisher).toEqual({
	"@id": "https://j-theravada.com/#organization",
});
```

Create `app/components/footer.test.tsx`:

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import Footer from "./footer";

test("運営組織を可視テキストで示す", () => {
	const html = renderToStaticMarkup(<Footer />);

	expect(html).toContain("運営：日本テーラワーダ仏教協会");
	expect(html).toContain('href="https://j-theravada.com/"');
});
```

Create `app/about/page.test.tsx`:

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import AboutPage, { metadata } from "./page";

test("Aboutで運営主体と法話アーカイブであることを明示する", () => {
	const html = renderToStaticMarkup(<AboutPage />);

	expect(metadata.description).toContain("日本テーラワーダ仏教協会が運営");
	expect(html).toContain("宗教法人日本テーラワーダ仏教協会が運営する");
	expect(html).toContain("法話デジタルアーカイブ");
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
/Users/tt/.bun/bin/bun test \
  app/application/seo/site-identity.test.ts \
  app/application/talk/detail.test.ts \
  app/components/footer.test.tsx \
  app/about/page.test.tsx
```

Expected: FAIL because `site-identity.ts` does not exist, VideoObject lacks `publisher`, and the visible copy lacks `運営：` / `法話デジタルアーカイブ`.

- [ ] **Step 3: Add the shared site identity helper**

Create `app/application/seo/site-identity.ts`:

```ts
import { buildCanonicalUrl, SITE_NAME, SITE_URL } from "../../utils/seo";

export const ASSOCIATION_ORGANIZATION_ID =
	"https://j-theravada.com/#organization";
export const SITE_DESCRIPTION =
	"日本テーラワーダ仏教協会が運営する、アルボムッレ・スマナサーラ長老の法話デジタルアーカイブ。動画と文字起こしを検索・閲覧できます。";

export type PublisherReference = { "@id": string };

export function buildPublisherReference(): PublisherReference {
	return { "@id": ASSOCIATION_ORGANIZATION_ID };
}

export function buildSiteIdentityJsonLd() {
	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebSite",
				"@id": `${SITE_URL}/#website`,
				name: SITE_NAME,
				url: buildCanonicalUrl("/"),
				description: SITE_DESCRIPTION,
				inLanguage: "ja",
				publisher: buildPublisherReference(),
			},
			{
				"@type": "Organization",
				"@id": ASSOCIATION_ORGANIZATION_ID,
				name: "日本テーラワーダ仏教協会",
				legalName: "宗教法人日本テーラワーダ仏教協会",
				url: "https://j-theravada.com/",
				logo: {
					"@type": "ImageObject",
					url: buildCanonicalUrl("/icon-512.png"),
					width: 512,
					height: 512,
				},
			},
		],
	} as const;
}
```

- [ ] **Step 4: Wire identity data into layout, videos, About, and footer**

In `app/layout.tsx`:

```ts
import {
	buildSiteIdentityJsonLd,
	SITE_DESCRIPTION,
} from "./application/seo/site-identity";
```

Remove the now-unused `SUMANASARA_JA_NAME` import from `app/layout.tsx`.

Replace the metadata description with:

```ts
description: SITE_DESCRIPTION,
```

Replace the inline WebSite/Organization array passed to the JSON-LD script with:

```ts
__html: JSON.stringify(buildSiteIdentityJsonLd()),
```

In `app/application/talk/detail.ts`, import the publisher helper:

```ts
import {
	buildPublisherReference,
	type PublisherReference,
} from "../seo/site-identity";
```

Add `publisher: PublisherReference` to the `videoJsonLd` type and add this field to the VideoObject value:

```ts
publisher: buildPublisherReference(),
```

In `app/about/page.tsx`, use this exact metadata description and opening paragraph:

```ts
description:
	"初期仏教塾は、宗教法人日本テーラワーダ仏教協会が運営する、アルボムッレ・スマナサーラ長老の法話デジタルアーカイブです。",
```

```tsx
<p>
	初期仏教塾は、宗教法人日本テーラワーダ仏教協会が運営する、
	{SUMANASARA_JA_NAME}の法話デジタルアーカイブです。
</p>
```

In `app/components/footer.tsx`, change only the link label:

```tsx
運営：日本テーラワーダ仏教協会
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the command from Step 2 again.

Expected: all focused tests PASS with no warnings.

- [ ] **Step 6: Format, inspect, and commit Task 1**

Run:

```bash
/Users/tt/.bun/bin/bunx oxfmt \
  app/application/seo/site-identity.ts \
  app/application/seo/site-identity.test.ts \
  app/layout.tsx \
  app/application/talk/detail.ts \
  app/application/talk/detail.test.ts \
  app/about/page.tsx \
  app/about/page.test.tsx \
  app/components/footer.tsx \
  app/components/footer.test.tsx
git diff --check
git add \
  app/application/seo/site-identity.ts \
  app/application/seo/site-identity.test.ts \
  app/layout.tsx \
  app/application/talk/detail.ts \
  app/application/talk/detail.test.ts \
  app/about/page.tsx \
  app/about/page.test.tsx \
  app/components/footer.tsx \
  app/components/footer.test.tsx
git commit -m "feat: identify the official talk archive publisher"
```

Expected: commit succeeds and contains only Task 1 files.

---

### Task 2: Add a crawlable static archive for every talk

**Files:**

- Create: `app/application/talk/archive.ts`
- Create: `app/application/talk/archive.test.ts`
- Create: `app/talks/archive/[page]/page.tsx`
- Create: `app/talks/archive/[page]/page.test.tsx`
- Create: `app/talks/page.test.tsx`
- Create: `app/sitemap.test.ts`
- Modify: `app/application/talk/links.ts`
- Modify: `app/application/talk/links.test.ts`
- Modify: `app/talks/page.tsx`
- Modify: `app/sitemap.ts`

**Interfaces:**

- Produces: `TALK_ARCHIVE_PAGE_SIZE = 100`
- Produces: `getTalkArchivePageCount(totalItems: number): number`
- Produces: `buildTalkArchivePage(items: TalkGalleryItem[], page: number): TalkArchivePage | null`
- Produces: `buildTalkArchiveHref(page: number): string`
- Consumes: `buildTalkGalleryItems(talks)` and its oldest-first order.

- [ ] **Step 1: Write failing pagination and link tests**

Create `app/application/talk/archive.test.ts` with a complete TalkGalleryItem fixture and boundary assertions:

```ts
import { describe, expect, test } from "bun:test";
import type { TalkGalleryItem } from "../../domain/talk/types";
import {
	buildTalkArchivePage,
	getTalkArchivePageCount,
	TALK_ARCHIVE_PAGE_SIZE,
} from "./archive";

function createItem(index: number): TalkGalleryItem {
	return {
		id: `TALK-${index}`,
		dvdId: `V-${index}`,
		collectionId: "monthly_talk",
		collectionLabel: "月例講演会",
		seriesId: "",
		seriesLabel: "",
		title: `法話 ${index}`,
		subtitle: "",
		attachmentsLink: null,
		youtubeUrl: null,
		thumbnailUrl: null,
		recordedOnFormatted: `2000年1月${index}日`,
		recordedOnSortValue: index,
		decadeLabel: "2000年代",
		themeLabel: "テーマ",
	};
}

describe("talk archive pagination", () => {
	test("100件ずつ分割して全件を重複なく返す", () => {
		const items = Array.from({ length: 201 }, (_, index) => createItem(index));
		const pages = [1, 2, 3].map((page) => buildTalkArchivePage(items, page));

		expect(TALK_ARCHIVE_PAGE_SIZE).toBe(100);
		expect(getTalkArchivePageCount(items.length)).toBe(3);
		expect(pages.map((page) => page?.items.length)).toEqual([100, 100, 1]);
		expect(pages.map((page) => [page?.previousPage, page?.nextPage])).toEqual([
			[null, 2],
			[1, 3],
			[2, null],
		]);
		expect(
			pages.flatMap((page) => page?.items.map((item) => item.id) ?? []),
		).toEqual(items.map((item) => item.id));
	});

	test("範囲外と非整数ページを拒否する", () => {
		const items = [createItem(1)];
		expect(buildTalkArchivePage(items, 0)).toBeNull();
		expect(buildTalkArchivePage(items, 1.5)).toBeNull();
		expect(buildTalkArchivePage(items, 2)).toBeNull();
	});
});
```

Add `buildTalkArchiveHref` to the existing import list in
`app/application/talk/links.test.ts`:

```ts
buildTalkArchiveHref,
```

Then add this test inside the existing `describe` block:

```ts
test("全法話アーカイブへのページリンクを組み立てる", () => {
	expect(buildTalkArchiveHref(1)).toBe("/talks/archive/1");
	expect(buildTalkArchiveHref(10)).toBe("/talks/archive/10");
});
```

- [ ] **Step 2: Run pagination tests and verify RED**

Run:

```bash
/Users/tt/.bun/bin/bun test \
  app/application/talk/archive.test.ts \
  app/application/talk/links.test.ts
```

Expected: FAIL because `archive.ts` and `buildTalkArchiveHref()` do not exist.

- [ ] **Step 3: Implement pure archive pagination and href building**

Create `app/application/talk/archive.ts`:

```ts
import type { TalkGalleryItem } from "../../domain/talk/types";

export const TALK_ARCHIVE_PAGE_SIZE = 100;

export type TalkArchivePage = {
	page: number;
	totalPages: number;
	items: TalkGalleryItem[];
	previousPage: number | null;
	nextPage: number | null;
};

export function getTalkArchivePageCount(totalItems: number): number {
	return Math.max(1, Math.ceil(totalItems / TALK_ARCHIVE_PAGE_SIZE));
}

export function buildTalkArchivePage(
	items: TalkGalleryItem[],
	page: number,
): TalkArchivePage | null {
	const totalPages = getTalkArchivePageCount(items.length);
	if (!Number.isInteger(page) || page < 1 || page > totalPages) return null;

	const start = (page - 1) * TALK_ARCHIVE_PAGE_SIZE;
	return {
		page,
		totalPages,
		items: items.slice(start, start + TALK_ARCHIVE_PAGE_SIZE),
		previousPage: page > 1 ? page - 1 : null,
		nextPage: page < totalPages ? page + 1 : null,
	};
}
```

Add to `app/application/talk/links.ts`:

```ts
export function buildTalkArchiveHref(page: number): string {
	return `/talks/archive/${page}`;
}
```

Run the Step 2 tests again. Expected: PASS.

- [ ] **Step 4: Write failing route, two-click reachability, and sitemap tests**

Create `app/talks/archive/[page]/page.test.tsx`:

```tsx
import { describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
	getTalkArchivePageCount,
	TALK_ARCHIVE_PAGE_SIZE,
} from "../../../application/talk/archive";
import { buildTalkGalleryItems } from "../../../application/talk/gallery";
import {
	buildTalkArchiveHref,
	buildTalkDetailHref,
} from "../../../application/talk/links";
import { getTalks } from "../../../infrastructure/talk/repository";

mock.module("next/navigation", () => ({
	notFound: () => {
		throw new Error("not found");
	},
}));

function extractTalkDetailHrefs(html: string): string[] {
	return Array.from(
		html.matchAll(/href="(\/talks\/(?!archive\/)[^"]+)"/g),
		(match) => match[1],
	);
}

describe("TalkArchivePage", () => {
	test("各ページの全法話を通常リンクで出して静的生成対象を列挙する", async () => {
		const { default: TalkArchivePage, generateStaticParams } =
			await import("./page");
		const talks = buildTalkGalleryItems(await getTalks());
		const totalPages = getTalkArchivePageCount(talks.length);
		const finalPage = totalPages;
		const finalPageOffset = (finalPage - 1) * TALK_ARCHIVE_PAGE_SIZE;
		const firstPageHtml = renderToStaticMarkup(
			await TalkArchivePage({ params: Promise.resolve({ page: "1" }) }),
		);
		const finalPageHtml = renderToStaticMarkup(
			await TalkArchivePage({
				params: Promise.resolve({ page: String(finalPage) }),
			}),
		);
		const params = await generateStaticParams();
		const firstPageHrefs = extractTalkDetailHrefs(firstPageHtml);
		const finalPageHrefs = extractTalkDetailHrefs(finalPageHtml);

		expect(firstPageHrefs).toHaveLength(
			Math.min(TALK_ARCHIVE_PAGE_SIZE, talks.length),
		);
		expect(firstPageHrefs).toEqual(
			talks
				.slice(0, TALK_ARCHIVE_PAGE_SIZE)
				.map((talk) => buildTalkDetailHref(talk.id)),
		);
		expect(finalPageHrefs).toHaveLength(talks.length - finalPageOffset);
		expect(finalPageHrefs).toEqual(
			talks.slice(finalPageOffset).map((talk) => buildTalkDetailHref(talk.id)),
		);
		expect(firstPageHtml).toContain(
			`href="${buildTalkArchiveHref(finalPage)}"`,
		);
		expect(params).toEqual(
			Array.from({ length: totalPages }, (_, index) => ({
				page: String(index + 1),
			})),
		);
	});

	test("中間ページに前後リンクを出す", async () => {
		const { default: TalkArchivePage } = await import("./page");
		const html = renderToStaticMarkup(
			await TalkArchivePage({ params: Promise.resolve({ page: "2" }) }),
		);

		expect(html).toContain('href="/talks/archive/1"');
		expect(html).toContain("← 前へ");
		expect(html).toContain('href="/talks/archive/3"');
		expect(html).toContain("次へ →");
	});

	test("ページごとにself-canonicalを返す", async () => {
		const { generateMetadata } = await import("./page");
		const metadata = await generateMetadata({
			params: Promise.resolve({ page: "2" }),
		});
		expect(metadata.alternates?.canonical).toBe(
			"https://early-buddhism.j-theravada.com/talks/archive/2",
		);
	});

	test("範囲外ページは404", async () => {
		const { default: TalkArchivePage } = await import("./page");
		const outOfRangePage =
			getTalkArchivePageCount((await getTalks()).length) + 1;
		await expect(
			TalkArchivePage({
				params: Promise.resolve({ page: String(outOfRangePage) }),
			}),
		).rejects.toThrow("not found");
	});
});
```

Create `app/talks/page.test.tsx`:

```tsx
import { expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { getTalkArchivePageCount } from "../application/talk/archive";
import { buildTalkGalleryItems } from "../application/talk/gallery";
import {
	buildTalkArchiveHref,
	buildTalkDetailHref,
} from "../application/talk/links";
import { getTalks } from "../infrastructure/talk/repository";

mock.module("next/navigation", () => ({
	notFound: () => {
		throw new Error("not found");
	},
	usePathname: () => "/talks",
	useRouter: () => ({ back: () => {} }),
}));

function extractHrefs(html: string): string[] {
	return Array.from(html.matchAll(/href="([^"]+)"/g), (match) => match[1]);
}

function extractTalkDetailHrefs(html: string): string[] {
	return extractHrefs(html).filter(
		(href) => href.startsWith("/talks/") && !href.startsWith("/talks/archive/"),
	);
}

function parseArchivePageHref(href: string): number {
	const match = href.match(/^\/talks\/archive\/(\d+)$/);
	if (!match) throw new Error(`Unexpected archive href: ${href}`);
	return Number(match[1]);
}

test("全法話を動画一覧から2クリック以内の通常リンクでたどれる", async () => {
	const [{ default: TalksPage }, { default: TalkArchivePage }] =
		await Promise.all([import("./page"), import("./archive/[page]/page")]);
	const talks = buildTalkGalleryItems(await getTalks());
	const expectedDetailHrefs = talks.map((talk) => buildTalkDetailHref(talk.id));
	const expectedArchiveHrefs = Array.from(
		{ length: getTalkArchivePageCount(talks.length) },
		(_, index) => buildTalkArchiveHref(index + 1),
	);
	const talksHtml = renderToStaticMarkup(await TalksPage());
	const previewDetailHrefs = extractTalkDetailHrefs(talksHtml);
	const linkedArchiveHrefs = new Set(
		extractHrefs(talksHtml).filter((href) =>
			href.startsWith("/talks/archive/"),
		),
	);

	expect(previewDetailHrefs).toEqual(expectedDetailHrefs.slice(0, 6));
	expect([...linkedArchiveHrefs].sort()).toEqual(
		[...expectedArchiveHrefs].sort(),
	);
	expect(talksHtml).toContain("全法話をページ一覧で見る");

	const linkedArchivePages = [...linkedArchiveHrefs]
		.map(parseArchivePageHref)
		.sort((left, right) => left - right);
	const archiveDetailHrefs = (
		await Promise.all(
			linkedArchivePages.map(async (page) =>
				extractTalkDetailHrefs(
					renderToStaticMarkup(
						await TalkArchivePage({
							params: Promise.resolve({ page: String(page) }),
						}),
					),
				),
			),
		)
	).flat();
	const reachableWithinTwoClicks = new Set([
		...previewDetailHrefs,
		...archiveDetailHrefs,
	]);

	expect(archiveDetailHrefs).toEqual(expectedDetailHrefs);
	expect([...reachableWithinTwoClicks].sort()).toEqual(
		[...expectedDetailHrefs].sort(),
	);
});
```

Create `app/sitemap.test.ts`:

```ts
import { expect, test } from "bun:test";
import { getTalkArchivePageCount } from "./application/talk/archive";
import {
	buildTalkArchiveHref,
	buildTalkDetailHref,
} from "./application/talk/links";
import { getTalks } from "./infrastructure/talk/repository";
import sitemap from "./sitemap";
import { buildCanonicalUrl } from "./utils/seo";

test("全アーカイブページと全法話詳細を含む", async () => {
	const talks = await getTalks();
	const entries = await sitemap();
	const urls = entries.map((entry) => entry.url);
	const archiveUrls = urls.filter((url) => url.includes("/talks/archive/"));
	const detailUrls = urls.filter(
		(url) => url.includes("/talks/") && !url.includes("/talks/archive/"),
	);
	const archiveUrlSet = new Set(archiveUrls);
	const detailUrlSet = new Set(detailUrls);
	const expectedArchiveUrlSet = new Set(
		Array.from({ length: getTalkArchivePageCount(talks.length) }, (_, index) =>
			buildCanonicalUrl(buildTalkArchiveHref(index + 1)),
		),
	);
	const expectedDetailUrlSet = new Set(
		talks.map((talk) => buildCanonicalUrl(buildTalkDetailHref(talk.id))),
	);

	expect(archiveUrls).toHaveLength(archiveUrlSet.size);
	expect(detailUrls).toHaveLength(detailUrlSet.size);
	expect([...archiveUrlSet].sort()).toEqual([...expectedArchiveUrlSet].sort());
	expect([...detailUrlSet].sort()).toEqual([...expectedDetailUrlSet].sort());
});
```

- [ ] **Step 5: Run route tests and verify RED**

Run:

```bash
/Users/tt/.bun/bin/bun test \
  'app/talks/archive/[page]/page.test.tsx' \
  app/talks/page.test.tsx \
  app/sitemap.test.ts
```

Expected: FAIL because the archive route, direct links from `/talks` to every archive page, and archive sitemap entries do not exist.

- [ ] **Step 6: Implement the static archive route**

Create `app/talks/archive/[page]/page.tsx` with these required exports and rendering rules:

```tsx
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
	buildTalkArchivePage,
	getTalkArchivePageCount,
} from "../../../application/talk/archive";
import { buildTalkGalleryItems } from "../../../application/talk/gallery";
import {
	buildTalkArchiveHref,
	buildTalkDetailHref,
} from "../../../application/talk/links";
import Footer from "../../../components/footer";
import Header from "../../../components/header";
import { getTalks } from "../../../infrastructure/talk/repository";
import { buildCanonicalUrl } from "../../../utils/seo";

type Props = { params: Promise<{ page: string }> };
export const dynamicParams = false;

function parsePage(value: string): number | null {
	const page = Number(value);
	return Number.isInteger(page) && page >= 1 ? page : null;
}

async function readArchivePage(value: string) {
	const page = parsePage(value);
	if (!page) return null;
	return buildTalkArchivePage(buildTalkGalleryItems(await getTalks()), page);
}

export async function generateStaticParams() {
	const totalPages = getTalkArchivePageCount((await getTalks()).length);
	return Array.from({ length: totalPages }, (_, index) => ({
		page: String(index + 1),
	}));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { page: value } = await params;
	const archive = await readArchivePage(value);
	if (!archive) return { title: "全法話一覧" };
	return {
		title: `全法話一覧 ${archive.page}ページ目`,
		description: `スマナサーラ長老の法話を収録日順に探せる全件一覧の${archive.page}ページ目です。`,
		alternates: {
			canonical: buildCanonicalUrl(buildTalkArchiveHref(archive.page)),
		},
	};
}

export default async function TalkArchivePage({ params }: Props) {
	const { page: value } = await params;
	const archive = await readArchivePage(value);
	if (!archive) notFound();

	const pages = Array.from(
		{ length: archive.totalPages },
		(_, index) => index + 1,
	);
	return (
		<div className="min-h-screen bg-white text-[#303030]">
			<Header />
			<main className="mx-auto max-w-4xl px-6 pb-20 pt-28 sm:px-8 lg:pt-36">
				<Link href="/talks" prefetch={false}>
					← 動画一覧へ戻る
				</Link>
				<h1 className="mt-8 text-3xl font-semibold">全法話一覧</h1>
				<p className="mt-3 text-sm text-gray-600">
					{archive.page} / {archive.totalPages}ページ
				</p>
				<ol className="mt-8 divide-y divide-gray-200 border-y border-gray-200">
					{archive.items.map((talk) => (
						<li data-talk-archive-item key={talk.id} className="py-4">
							<Link href={buildTalkDetailHref(talk.id)} prefetch={false}>
								<span className="block text-xs text-gray-500">
									{talk.recordedOnFormatted}
								</span>
								<span className="mt-1 block font-medium">{talk.title}</span>
							</Link>
						</li>
					))}
				</ol>
				<nav
					aria-label="全法話一覧のページ"
					className="mt-10 flex flex-wrap gap-2"
				>
					{pages.map((page) => (
						<Link
							aria-current={page === archive.page ? "page" : undefined}
							href={buildTalkArchiveHref(page)}
							key={page}
							prefetch={false}
						>
							{page}
						</Link>
					))}
				</nav>
			</main>
			<Footer maxWidth="4xl" />
		</div>
	);
}
```

Replace the navigation block above with the complete version below so every
archive page exposes both adjacent links and all page-number links:

```tsx
<nav
	aria-label="全法話一覧のページ"
	className="mt-10 flex flex-wrap items-center justify-center gap-2"
>
	{archive.previousPage && (
		<Link href={buildTalkArchiveHref(archive.previousPage)} prefetch={false}>
			← 前へ
		</Link>
	)}
	{pages.map((page) => (
		<Link
			aria-current={page === archive.page ? "page" : undefined}
			href={buildTalkArchiveHref(page)}
			key={page}
			prefetch={false}
		>
			{page}
		</Link>
	))}
	{archive.nextPage && (
		<Link href={buildTalkArchiveHref(archive.nextPage)} prefetch={false}>
			次へ →
		</Link>
	)}
</nav>
```

- [ ] **Step 7: Link directly from `/talks` to every archive page and include archive pages in sitemap**

In `app/talks/page.tsx`, import `Link`, `getTalkArchivePageCount()`, and `buildTalkArchiveHref()`. Derive the page numbers from the current talk count:

```ts
const archivePages = Array.from(
	{ length: getTalkArchivePageCount(talks.length) },
	(_, index) => index + 1,
);
```

Then add this outside `TalkGalleryLoader` so both the existing entry point and compact page navigation remain server-rendered ordinary links:

```tsx
<div className="mt-10 text-center">
	<Link
		className="home-outline-button"
		href={buildTalkArchiveHref(1)}
		prefetch={false}
	>
		全法話をページ一覧で見る
	</Link>
	<nav
		aria-label="全法話一覧のページへ移動"
		className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm"
	>
		<span className="text-xs text-gray-500">ページ</span>
		{archivePages.map((page) => (
			<Link
				className="inline-flex min-w-8 items-center justify-center rounded-full border border-amber-200 px-2 py-1 text-amber-800 transition hover:border-amber-300 hover:bg-amber-50"
				href={buildTalkArchiveHref(page)}
				key={page}
				prefetch={false}
			>
				{page}
			</Link>
		))}
	</nav>
</div>
```

In `app/sitemap.ts`, build archive pages from the same talk count:

```ts
const archivePages: MetadataRoute.Sitemap = Array.from(
	{ length: getTalkArchivePageCount(talks.length) },
	(_, index) => ({
		url: buildCanonicalUrl(buildTalkArchiveHref(index + 1)),
		changeFrequency: "weekly",
		priority: 0.5,
	}),
);
```

Return the final sitemap in this order:

```ts
return [...staticPages, ...archivePages, ...talkPages];
```

- [ ] **Step 8: Run all Task 2 tests and verify GREEN**

Run:

```bash
/Users/tt/.bun/bin/bun test \
  app/application/talk/archive.test.ts \
  app/application/talk/links.test.ts \
  'app/talks/archive/[page]/page.test.tsx' \
  app/talks/page.test.tsx \
  app/sitemap.test.ts
```

Expected: all Task 2 tests PASS; page 1 contains up to `TALK_ARCHIVE_PAGE_SIZE` ordinary detail links, static params match `getTalkArchivePageCount()`, `/talks` keeps exactly six preview detail links, and every expected detail href is reachable within two edges with no missing or unexpected href.

- [ ] **Step 9: Format, inspect, and commit Task 2**

Run:

```bash
/Users/tt/.bun/bin/bunx oxfmt \
  app/application/talk/archive.ts \
  app/application/talk/archive.test.ts \
  app/application/talk/links.ts \
  app/application/talk/links.test.ts \
  'app/talks/archive/[page]/page.tsx' \
  'app/talks/archive/[page]/page.test.tsx' \
  app/talks/page.tsx \
  app/talks/page.test.tsx \
  app/sitemap.ts \
  app/sitemap.test.ts
git diff --check
git add \
  app/application/talk/archive.ts \
  app/application/talk/archive.test.ts \
  app/application/talk/links.ts \
  app/application/talk/links.test.ts \
  'app/talks/archive/[page]/page.tsx' \
  'app/talks/archive/[page]/page.test.tsx' \
  app/talks/page.tsx \
  app/talks/page.test.tsx \
  app/sitemap.ts \
  app/sitemap.test.ts
git commit -m "feat: add a crawlable talk archive"
```

Expected: commit succeeds and the current client gallery files are untouched.

---

### Task 3: Server-render compact transcripts and load timelines on demand

**Files:**

- Create: `app/components/transcript-readable.tsx`
- Create: `app/components/transcript-readable.test.tsx`
- Create: `app/components/transcript-section-loader.test.tsx`
- Create: `app/components/transcript-section-loader.client.test.tsx`
- Modify: `app/talks/[id]/page.tsx`
- Modify: `app/talks/[id]/page.test.tsx`
- Modify: `app/components/transcript-section-loader.tsx`
- Modify: `app/components/transcript-section.tsx`
- Modify: `app/components/transcript-section.test.tsx`
- Modify: `package.json`
- Modify: `bun.lock`

**Interfaces:**

- Produces: `TranscriptReadable({ paragraphs: string[] })`
- Produces: `getInitialTranscriptMode(targetCueIndex, query): "plain" | "timeline"`
- Produces: `TranscriptContent` presentational component that keeps `children` visible unless timeline data is ready.
- Consumes: `getTranscriptByTalkId(id)` and `buildTranscriptParagraphs(cues)`.
- Preserves: `GET /api/transcripts/[id] -> { transcript: TranscriptCue[] }`.
- Tests mounted client effects with dev-only `happy-dom`; it supplies a DOM for React effect/fetch/abort coverage without adding runtime application code or a production dependency.

- [ ] **Step 1: Write failing compact transcript component tests**

Create `app/components/transcript-readable.test.tsx`:

```tsx
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import TranscriptReadable from "./transcript-readable";

test("全文を簡潔な段落HTMLとして出す", () => {
	const html = renderToStaticMarkup(
		<TranscriptReadable paragraphs={["第一段落です。", "第二段落です。"]} />,
	);

	expect(html).toContain("第一段落です。");
	expect(html).toContain("第二段落です。");
	expect((html.match(/<p/g) ?? []).length).toBe(2);
	expect(html).not.toContain("00:00:");
	expect(html).not.toContain("文字起こしを読み込み中です");
});
```

In the existing `動画はスクロールしても画面上部に残る` test in
`app/talks/[id]/page.test.tsx`, remove the old positive loading-placeholder
assertion and replace it with:

```ts
expect(html).toContain("で 大体一体全体仏教って何でしょうかと");
expect(html).toContain("読みやすく");
expect(html).toContain("タイムライン付き");
expect(html).not.toContain("文字起こしを読み込み中です。");
```

Add a separate missing-transcript test using `TALK-4779A1FF8511`:

```tsx
test("生成済み文字起こしがない法話では文字起こしセクションを出さない", async () => {
	const { default: TalkDetailPage } = await import("./page");
	const html = renderToStaticMarkup(
		await TalkDetailPage({
			params: Promise.resolve({ id: "TALK-4779A1FF8511" }),
		}),
	);

	expect(html).not.toContain("文字起こし表示");
	expect(html).not.toContain("文字起こしを読み込み中です。");
});
```

- [ ] **Step 2: Run readable/page tests and verify RED**

Run:

```bash
/Users/tt/.bun/bin/bun test \
  app/components/transcript-readable.test.tsx \
  'app/talks/[id]/page.test.tsx'
```

Expected: FAIL because `TranscriptReadable` does not exist and the detail HTML still contains only the loading message.

- [ ] **Step 3: Add the compact Server Component**

Create `app/components/transcript-readable.tsx`:

```tsx
type Props = { paragraphs: string[] };

export default function TranscriptReadable({ paragraphs }: Props) {
	return (
		<div className="mt-4 space-y-3" data-transcript-readable>
			{paragraphs.map((paragraph, index) => (
				<p
					className="text-sm leading-7 text-gray-700"
					key={`${index}-${paragraph.slice(0, 12)}`}
				>
					{paragraph}
				</p>
			))}
		</div>
	);
}
```

- [ ] **Step 4: Write failing shell/timeline and mounted client-effect tests**

Create `app/components/transcript-section-loader.test.tsx`:

```tsx
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import TranscriptSectionLoader, {
	getInitialTranscriptMode,
	TranscriptContent,
} from "./transcript-section-loader";

describe("TranscriptSectionLoader", () => {
	test("通常アクセスは読みやすい全文を初期表示する", () => {
		const html = renderToStaticMarkup(
			<TranscriptSectionLoader talkId="TALK-1">
				<p>SSR済み全文</p>
			</TranscriptSectionLoader>,
		);

		expect(getInitialTranscriptMode(null, null)).toBe("plain");
		expect(html).toContain("SSR済み全文");
		expect(html).toContain('aria-selected="true"');
		expect(html).not.toContain("文字起こしを読み込み中です");
	});

	test("cueまたは検索語指定はタイムラインから開始する", () => {
		expect(getInitialTranscriptMode(0, null)).toBe("timeline");
		expect(getInitialTranscriptMode(null, "慈悲")).toBe("timeline");
	});

	test("動画あり詳細では表示切り替えを動画下に固定する", () => {
		const html = renderToStaticMarkup(
			<TranscriptSectionLoader hasStickyPlayer talkId="TALK-1">
				<p>SSR済み全文</p>
			</TranscriptSectionLoader>,
		);

		expect(html).toContain("sticky transcript-toolbar-sticky");
	});

	test("タイムライン取得失敗時もSSR済み全文を残す", () => {
		const html = renderToStaticMarkup(
			<TranscriptContent mode="timeline" status="error" transcript={null}>
				<p>消してはいけない全文</p>
			</TranscriptContent>,
		);

		expect(html).toContain("消してはいけない全文");
		expect(html).toContain("タイムラインを読み込めませんでした");
	});
});
```

Add `happy-dom` as a development-only dependency:

```bash
/Users/tt/.bun/bin/bun add --dev happy-dom
```

This updates `package.json` and `bun.lock`. The dependency is only a mounted
client-test environment: static server rendering cannot run `useEffect`, click
handlers, request cancellation, or prop-update synchronization, and no DOM
emulator is shipped to production.

Create `app/components/transcript-section-loader.client.test.tsx` with a real
`createRoot()` mounted into a `happy-dom` `Window`. Use `act()` around renders
and button clicks, restore globals/fetch after each test, and cover these
observable behaviors without mocking the component under test:

- normal plain mode performs no transcript request and keeps the SSR child;
- selecting timeline fetches once, renders cues, and reuses the fetched data
  after switching modes;
- initial cue/query deep links automatically select and load timeline mode;
- adding a cue prop while the same talk remains mounted switches to timeline,
  while removing deep-link props does not overwrite a later manual plain-mode
  choice (one-way prop synchronization);
- 404/network failures retain the SSR child and a repeated timeline selection
  retries;
- changing talks or unmounting aborts an in-flight request.

Update `app/components/transcript-section.test.tsx` so it tests timeline-only
behavior. Remove assertions for mode buttons, the AI notice, and sticky-toolbar
layout; retain assertions for cue IDs, timestamps, target highlighting, and
time-link construction. Sticky-toolbar behavior is now covered by the loader
test above.

- [ ] **Step 5: Run shell/timeline tests and verify RED**

Run:

```bash
/Users/tt/.bun/bin/bun test \
  app/components/transcript-section-loader.test.tsx \
  app/components/transcript-section-loader.client.test.tsx \
  app/components/transcript-section.test.tsx
```

Expected: FAIL because the loader has no children/mode shell or `TranscriptContent`, its mounted effects do not yet satisfy the on-demand/deep-link lifecycle, and the existing TranscriptSection still owns both modes.

- [ ] **Step 6: Refactor the loader into the mode shell**

Replace `app/components/transcript-section-loader.tsx` with this complete mode
shell. It deliberately has no IntersectionObserver; timeline loading is driven
only by explicit selection or a cue/query deep link. The prop-synchronization
effect is intentionally one-way: a cue/query added during same-page navigation
forces timeline mode, but removing the deep-link props does not force plain mode
or overwrite the user's later manual selection.

```tsx
"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useEffect, useState } from "react";
import type { TranscriptCue } from "../domain/transcript/types";
import { FEEDBACK_FORM_URL } from "../utils/site-links";

const TranscriptSection = dynamic(() => import("./transcript-section"), {
	loading: () => null,
});

export type TranscriptMode = "plain" | "timeline";
export type TranscriptLoadStatus =
	| "idle"
	| "loading"
	| "ready"
	| "missing"
	| "error";

type Props = {
	children: ReactNode;
	talkId: string;
	embedUrlPrefix?: string | null;
	hasStickyPlayer?: boolean;
	transcriptHighlightQuery?: string | null;
	targetCueIndex?: number | null;
};

type TimelineProps = Pick<
	Props,
	"embedUrlPrefix" | "transcriptHighlightQuery" | "targetCueIndex"
>;

const MODE_OPTIONS: Array<{ mode: TranscriptMode; label: string }> = [
	{ mode: "plain", label: "読みやすく" },
	{ mode: "timeline", label: "タイムライン付き" },
];

function getModeButtonClass(isActive: boolean): string {
	return `w-full min-w-0 whitespace-nowrap text-center rounded-full px-3 py-1 transition sm:min-w-[8.5rem] sm:px-3.5 sm:py-1.5 ${
		isActive
			? "bg-amber-100 text-amber-900"
			: "text-amber-700 hover:text-amber-900"
	}`;
}

function buildTranscriptApiUrl(talkId: string): string {
	return `/api/transcripts/${encodeURIComponent(talkId)}`;
}

function parseTranscriptResponse(value: unknown): TranscriptCue[] {
	if (typeof value !== "object" || value === null || !("transcript" in value)) {
		throw new Error("Transcript response must include transcript.");
	}
	const transcript = (value as { transcript: unknown }).transcript;
	if (!Array.isArray(transcript)) {
		throw new Error("Transcript must be an array.");
	}
	return transcript as TranscriptCue[];
}

export function getInitialTranscriptMode(
	targetCueIndex: number | null | undefined,
	transcriptHighlightQuery: string | null | undefined,
): TranscriptMode {
	return targetCueIndex !== null && targetCueIndex !== undefined
		? "timeline"
		: transcriptHighlightQuery?.trim()
			? "timeline"
			: "plain";
}

export function TranscriptContent({
	children,
	mode,
	status,
	transcript,
	...timelineProps
}: {
	children: ReactNode;
	mode: TranscriptMode;
	status: TranscriptLoadStatus;
	transcript: TranscriptCue[] | null;
} & TimelineProps) {
	if (mode === "timeline" && status === "ready" && transcript) {
		return <TranscriptSection transcript={transcript} {...timelineProps} />;
	}

	return (
		<>
			{mode === "timeline" && status === "loading" && (
				<p className="mt-4 text-sm text-gray-600">
					タイムラインを読み込んでいます。
				</p>
			)}
			{mode === "timeline" && (status === "error" || status === "missing") && (
				<p className="mt-4 text-sm text-red-700">
					タイムラインを読み込めませんでした。読みやすい全文を表示しています。
				</p>
			)}
			{children}
		</>
	);
}

export default function TranscriptSectionLoader({
	children,
	talkId,
	embedUrlPrefix,
	hasStickyPlayer = false,
	transcriptHighlightQuery,
	targetCueIndex,
}: Props) {
	const [mode, setMode] = useState<TranscriptMode>(() =>
		getInitialTranscriptMode(targetCueIndex, transcriptHighlightQuery),
	);
	const [status, setStatus] = useState<TranscriptLoadStatus>("idle");
	const [transcript, setTranscript] = useState<TranscriptCue[] | null>(null);
	const [retryToken, setRetryToken] = useState(0);

	useEffect(() => {
		if (
			getInitialTranscriptMode(targetCueIndex, transcriptHighlightQuery) ===
			"timeline"
		) {
			setMode("timeline");
		}
	}, [targetCueIndex, transcriptHighlightQuery]);

	useEffect(() => {
		if (mode !== "timeline" || transcript !== null) return;

		const controller = new AbortController();
		setStatus("loading");

		async function loadTranscript() {
			try {
				const response = await fetch(buildTranscriptApiUrl(talkId), {
					signal: controller.signal,
				});
				if (response.status === 404) {
					setStatus("missing");
					return;
				}
				if (!response.ok) {
					throw new Error(`Transcript request failed: ${response.status}`);
				}
				setTranscript(parseTranscriptResponse(await response.json()));
				setStatus("ready");
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError")
					return;
				setStatus("error");
			}
		}

		void loadTranscript();
		return () => controller.abort();
	}, [mode, retryToken, talkId, transcript]);

	function selectMode(nextMode: TranscriptMode) {
		if (
			nextMode === "timeline" &&
			mode === "timeline" &&
			(status === "error" || status === "missing")
		) {
			setRetryToken((current) => current + 1);
		}
		setMode(nextMode);
	}

	return (
		<section className="mt-6 border-t border-gray-100 pt-6">
			<div
				className={`sticky ${
					hasStickyPlayer ? "transcript-toolbar-sticky" : "top-0"
				} z-10 -mx-6 border-y border-amber-100 bg-white/95 px-6 py-2.5 backdrop-blur`}
			>
				<div className="flex flex-wrap items-center gap-2.5 lg:flex-nowrap">
					<h2 className="sr-only">文字起こし表示</h2>
					<div
						aria-label="表示モードの切り替え"
						className="grid w-full grid-cols-2 rounded-full border border-amber-200 bg-white text-xs font-medium text-amber-900 sm:w-auto sm:text-sm"
						role="tablist"
					>
						{MODE_OPTIONS.map((option) => (
							<button
								aria-selected={mode === option.mode}
								className={getModeButtonClass(mode === option.mode)}
								key={option.mode}
								onClick={() => selectMode(option.mode)}
								role="tab"
								type="button"
							>
								{option.label}
							</button>
						))}
					</div>
					<p className="min-w-0 text-xs text-amber-800 sm:ml-auto lg:whitespace-nowrap">
						AI文字起こしです。誤りは
						<a
							className="mx-0.5 font-medium underline hover:text-amber-700"
							href={FEEDBACK_FORM_URL}
							rel="noopener noreferrer"
							target="_blank"
						>
							こちら
						</a>
						へ。
					</p>
				</div>
			</div>
			<TranscriptContent
				embedUrlPrefix={embedUrlPrefix}
				mode={mode}
				status={status}
				targetCueIndex={targetCueIndex}
				transcript={transcript}
				transcriptHighlightQuery={transcriptHighlightQuery}
			>
				{children}
			</TranscriptContent>
		</section>
	);
}
```

- [ ] **Step 7: Narrow TranscriptSection to timeline rendering**

Replace `app/components/transcript-section.tsx` with the complete timeline-only
component below. This retains player events, cue IDs, timestamps, highlighting,
and target scrolling while removing mode and paragraph responsibilities.

```tsx
"use client";

import { type MouseEvent, useEffect, useMemo } from "react";
import {
	LOAD_TALK_PLAYER_EVENT,
	type LoadTalkPlayerEventDetail,
} from "../application/talk/player-events";
import { tokenizeSearchQuery } from "../application/talk/search";
import { buildCueTimeHref } from "../application/transcript/presentation";
import type { TranscriptCue } from "../domain/transcript/types";
import { highlightMatches } from "./talk-gallery/highlight";

type Props = {
	transcript: TranscriptCue[];
	embedUrlPrefix?: string | null;
	transcriptHighlightQuery?: string | null;
	targetCueIndex?: number | null;
};

function loadTalkPlayer(event: MouseEvent<HTMLAnchorElement>, src: string) {
	event.preventDefault();
	window.dispatchEvent(
		new CustomEvent<LoadTalkPlayerEventDetail>(LOAD_TALK_PLAYER_EVENT, {
			detail: { src },
		}),
	);
}

export default function TranscriptSection({
	transcript,
	embedUrlPrefix,
	transcriptHighlightQuery,
	targetCueIndex,
}: Props) {
	const highlightTokens = useMemo(
		() => tokenizeSearchQuery(transcriptHighlightQuery ?? ""),
		[transcriptHighlightQuery],
	);

	useEffect(() => {
		if (targetCueIndex === null || targetCueIndex === undefined) return;
		const target = document.getElementById(`transcript-cue-${targetCueIndex}`);
		target?.scrollIntoView({ block: "center" });
	}, [targetCueIndex]);

	return (
		<div className="mt-4 grid gap-y-2.5">
			{transcript.map((cue) => {
				const startSeconds = Math.max(0, Math.floor(cue.start));
				const timeHref = buildCueTimeHref(embedUrlPrefix, startSeconds);
				const timeRangeLabel = `${cue.startLabel} - ${cue.endLabel}`;
				const isTargetCue = targetCueIndex === cue.index;

				return (
					<div
						className={`scroll-mt-32 grid gap-x-4 gap-y-0.5 sm:grid-cols-[110px_1fr] ${
							isTargetCue
								? "-mx-3 rounded-md border-l-2 border-amber-400 bg-yellow-50 px-3 py-2"
								: ""
						}`}
						id={`transcript-cue-${cue.index}`}
						key={`${cue.index}-${cue.start}`}
					>
						<div className="sm:pt-0.5">
							{timeHref ? (
								<a
									className="text-sm font-medium text-amber-700 underline transition hover:text-amber-900"
									href={timeHref}
									onClick={(event) => loadTalkPlayer(event, timeHref)}
								>
									{cue.startLabel}
								</a>
							) : (
								<span className="text-sm font-medium text-amber-700">
									{cue.startLabel}
								</span>
							)}
							<p className="text-[11px] text-stone-400">{timeRangeLabel}</p>
						</div>
						<p className="whitespace-pre-line text-sm leading-7 text-gray-700">
							{highlightMatches(cue.text, highlightTokens)}
						</p>
					</div>
				);
			})}
		</div>
	);
}
```

- [ ] **Step 8: Load and render the transcript in the detail Server Component**

In `app/talks/[id]/page.tsx`, import:

```ts
import { buildTranscriptParagraphs } from "../../application/transcript/presentation";
import TranscriptReadable from "../../components/transcript-readable";
import { getTranscriptByTalkId } from "../../infrastructure/transcript/repository";
```

Replace the talk-only lookup with:

```ts
const [talk, transcript] = await Promise.all([
	getTalkById(id),
	getTranscriptByTalkId(id),
]);
```

After the `notFound()` guard, derive:

```ts
const transcriptParagraphs = transcript
	? buildTranscriptParagraphs(transcript)
	: [];
```

Replace the current `hasTranscript`/loader block with:

```tsx
{
	transcriptParagraphs.length > 0 && (
		<TranscriptSectionLoader
			embedUrlPrefix={pageData.embedUrlPrefix}
			hasStickyPlayer={Boolean(pageData.talk.embedUrl)}
			key={talk.id}
			talkId={talk.id}
			targetCueIndex={targetCueIndex}
			transcriptHighlightQuery={transcriptHighlightQuery}
		>
			<TranscriptReadable paragraphs={transcriptParagraphs} />
		</TranscriptSectionLoader>
	);
}
```

Do not infer transcript availability from `srtLink`; use the generated local file result.

- [ ] **Step 9: Run all Task 3 tests and verify GREEN**

Run:

```bash
/Users/tt/.bun/bin/bun test \
  app/components/transcript-readable.test.tsx \
  app/components/transcript-section-loader.test.tsx \
  app/components/transcript-section-loader.client.test.tsx \
  app/components/transcript-section.test.tsx \
  'app/talks/[id]/page.test.tsx'
```

Expected: all tests PASS. The representative detail HTML contains `で 大体一体全体仏教って何でしょうかと` and does not contain `文字起こしを読み込み中です。`; mounted client coverage proves on-demand fetch, cache reuse, retry, abort, and one-way deep-link prop synchronization.

- [ ] **Step 10: Format, inspect, and commit Task 3**

Run:

```bash
/Users/tt/.bun/bin/bunx oxfmt \
  app/components/transcript-readable.tsx \
  app/components/transcript-readable.test.tsx \
  app/components/transcript-section-loader.tsx \
  app/components/transcript-section-loader.test.tsx \
  app/components/transcript-section-loader.client.test.tsx \
  app/components/transcript-section.tsx \
  app/components/transcript-section.test.tsx \
  'app/talks/[id]/page.tsx' \
  'app/talks/[id]/page.test.tsx' \
  package.json
git diff --check
git add \
  app/components/transcript-readable.tsx \
  app/components/transcript-readable.test.tsx \
  app/components/transcript-section-loader.tsx \
  app/components/transcript-section-loader.test.tsx \
  app/components/transcript-section-loader.client.test.tsx \
  app/components/transcript-section.tsx \
  app/components/transcript-section.test.tsx \
  'app/talks/[id]/page.tsx' \
  'app/talks/[id]/page.test.tsx' \
  package.json \
  bun.lock
git commit -m "feat: expose transcripts in initial talk HTML"
```

Expected: commit succeeds; `app/api/transcripts/[id]/route.ts` remains unchanged.

---

### Task 4: Verify the complete crawlable production output

**Files:**

- Inspect only: all files changed in Tasks 1–3
- Update only if a verification failure exposes a real defect; every such fix requires a new failing regression test first.

**Interfaces:**

- Consumes: production build output from Tasks 1–3.
- Produces: fresh evidence for tests, formatting, lint, build, initial HTML transcript text, archive completeness, and publisher JSON-LD.

- [ ] **Step 1: Run the full automated suite**

Run:

```bash
/Users/tt/.bun/bin/bun test app/components/transcript-section-loader.client.test.tsx
/Users/tt/.bun/bin/bun test
/Users/tt/.bun/bin/bun run format:check
/Users/tt/.bun/bin/bun run lint
```

Expected: the mounted client-effect test and the complete suite PASS, formatting reports no changes, and lint exits 0 with no errors.

- [ ] **Step 2: Build the production application**

Run:

```bash
/Users/tt/.bun/bin/bun run build
```

Expected: exit 0; static output includes `/talks/archive/[page]` params and no type errors.

- [ ] **Step 3: Start production locally and inspect JavaScript-free HTML**

Run in a persistent terminal:

```bash
PORT=3100 /Users/tt/.bun/bin/bun run start
```

Then run:

```bash
curl -sS http://localhost:3100/talks/TALK-V-013-1-ADC344BF78FB > /tmp/early-buddhism-talk.html
rg -n "で 大体一体全体仏教って何でしょうかと|文字起こしを読み込み中です" /tmp/early-buddhism-talk.html
curl -sS http://localhost:3100/talks > /tmp/early-buddhism-talks.html
rg -o 'href="/talks/archive/[0-9]+"' /tmp/early-buddhism-talks.html | sort -u
curl -sS http://localhost:3100/ > /tmp/early-buddhism-home.html
rg -n '日本テーラワーダ仏教協会|https://j-theravada.com/#organization' /tmp/early-buddhism-home.html
```

Expected:

- Representative talk HTML contains the known transcript text.
- Representative talk HTML has no loading-placeholder match.
- `/talks` contains direct ordinary hrefs for every current archive page.
- Homepage JSON-LD contains the association name and Organization ID.

- [ ] **Step 4: Verify archive reachability and completeness**

Run this read-only Node check against the local production server:

```bash
/Users/tt/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node <<'NODE'
(async () => {
  const baseUrl = "http://localhost:3100";
  const expected = require("./app/generated/talks.json").map(
    (talk) => `/talks/${encodeURIComponent(talk.id)}`,
  );
  const talksHtml = await fetch(`${baseUrl}/talks`).then((response) => {
    if (!response.ok) throw new Error(`/talks: ${response.status}`);
    return response.text();
  });
  const previewHrefs = Array.from(
    talksHtml.matchAll(/href="(\/talks\/(?!archive\/)[^"?#]+)"/g),
    (match) => match[1],
  );
  const archiveHrefs = Array.from(
    new Set(
      Array.from(
        talksHtml.matchAll(/href="(\/talks\/archive\/\d+)"/g),
        (match) => match[1],
      ),
    ),
  );
  const found = new Set();
  for (const href of archiveHrefs) {
    const html = await fetch(new URL(href, baseUrl)).then((response) => {
      if (!response.ok) throw new Error(`${href}: ${response.status}`);
      return response.text();
    });
    for (const match of html.matchAll(/href="(\/talks\/(?!archive\/)[^"?#]+)"/g)) {
      found.add(match[1]);
    }
  }
  const missing = expected.filter((id) => !found.has(id));
  const unexpected = [...found].filter((id) => !expected.includes(id));
  console.log(
    JSON.stringify(
      {
        previewLinks: previewHrefs.length,
        archivePagesLinkedFromTalks: archiveHrefs.length,
        expected: expected.length,
        found: found.size,
        missing,
        unexpected,
      },
      null,
      2,
    ),
  );
  if (
    previewHrefs.length !== 6 ||
    archiveHrefs.length === 0 ||
    missing.length ||
    unexpected.length ||
    found.size !== expected.length
  ) process.exit(1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE
```

Expected: `previewLinks` is exactly 6, the archive-page link count is derived
from rendered `/talks`, `found` equals the current repository talk count, and
both `missing` and `unexpected` are empty. This is the production equivalent of
the two-edge rendered-link graph test.

- [ ] **Step 5: Verify the timeline interaction in a real browser**

Open `http://localhost:3100/talks/TALK-V-013-1-ADC344BF78FB` with the browser
network panel visible and verify this exact sequence:

1. The page initially shows `読みやすく` as selected and the complete paragraph transcript.
2. No `/api/transcripts/TALK-V-013-1-ADC344BF78FB` request occurs before interaction.
3. Clicking `タイムライン付き` issues exactly one transcript request and shows cue timestamps.
4. Switching to `読みやすく` and back to `タイムライン付き` does not issue a second request.
5. Opening `/talks/TALK-V-013-1-ADC344BF78FB?transcriptQuery=仏教&transcriptCue=1#transcript-cue-1` automatically loads the timeline, highlights the target text, and scrolls cue 1 into view.

Expected: all five checks pass with no console errors.

- [ ] **Step 6: Inspect response size and prevent the rejected full-timeline SSR design**

Run:

```bash
wc -c /tmp/early-buddhism-talk.html
rg -o 'id="transcript-cue-[0-9]+"' /tmp/early-buddhism-talk.html | wc -l
```

Expected:

- The page contains full paragraph text but zero cue-level timeline IDs on a normal URL.
- The HTML remains materially below the rejected cue-heavy rendering; if the representative page exceeds 600KB uncompressed, stop and inspect RSC/text duplication before completion.

- [ ] **Step 7: Review requirements and repository state**

Run:

```bash
BASE_SHA=$(git merge-base HEAD main)
git status --short
git log --oneline "$BASE_SHA"..HEAD
git diff --stat "$BASE_SHA"..HEAD
git diff --name-status "$BASE_SHA"..HEAD
git diff "$BASE_SHA"..HEAD
```

Read the design spec line by line and confirm:

- compact transcript SSR is present;
- timeline remains on demand and deep-link aware;
- all talks are ordinarily linked;
- site/operator/publisher identity is consistent;
- monthly collection pages, search algorithms, and transcript APIs were not expanded.

Expected: working tree clean. Task commits may be followed by one or more
review-fix commits; do not require exactly three implementation commits.
Instead, inspect the complete merge-base-to-HEAD log, file list, and diff to
confirm that all intended content is present, every changed path belongs to the
enumerated task/review-fix scope, and no prohibited surface changed.

---

## Post-deployment follow-up (not authorized by this plan)

After a separately requested push/deployment:

1. On an authorized preview deployment, request an invalid archive route and
   inspect deployment logs. A correct 404 is already the required behavior;
   record whether the local Next.js `NoFallbackError` noise reproduces, but do
   not make speculative product changes unless the preview response itself is
   wrong.
2. Wait until the Vercel production deployment is `Ready`.
3. Repeat the HTML checks against `https://early-buddhism.j-theravada.com`.
4. Validate homepage and representative talk JSON-LD.
5. Use Search Console URL Inspection for `/`, `/talks`, `/talks/archive/1`, and a representative talk.
6. Request indexing and monitor queries, impressions, clicks, and average position; do not treat immediate ranking changes as an implementation pass/fail condition.
