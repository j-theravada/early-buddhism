import { describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("next/navigation", () => ({
	notFound: () => {
		throw new Error("not found");
	},
	permanentRedirect: (href: string) => {
		throw new Error(`permanent redirect: ${href}`);
	},
	useRouter: () => ({
		back: () => {},
	}),
}));

describe("TalkDetailPage", () => {
	test("metadataにcanonicalを出す", async () => {
		const { generateMetadata } = await import("./page");

		const metadata = await generateMetadata({
			params: Promise.resolve({ id: "TALK-V-013-1-ADC344BF78FB" }),
		});

		expect(metadata.alternates?.canonical).toBe(
			"https://early-buddhism.j-theravada.com/talks/TALK-V-013-1-ADC344BF78FB",
		);
	});

	test("詳細画面の内容幅は表示内容に引っ張られず親幅いっぱいを保つ", async () => {
		const { default: TalkDetailPage } = await import("./page");

		const html = renderToStaticMarkup(
			await TalkDetailPage({
				params: Promise.resolve({ id: "TALK-V-013-1-ADC344BF78FB" }),
			}),
		);

		expect(html).toContain(
			'<main class="w-full mx-auto max-w-4xl px-6 py-12 sm:px-8 flex-1">',
		);
		expect(html).toContain("<h1");
	});

	test("動画はスクロールしても画面上部に残る", async () => {
		const { default: TalkDetailPage } = await import("./page");

		const html = renderToStaticMarkup(
			await TalkDetailPage({
				params: Promise.resolve({ id: "TALK-V-013-1-ADC344BF78FB" }),
			}),
		);

		expect(html).toContain("sticky top-0 z-20");
		expect(html).toContain("talk-detail-player-shell relative mx-auto");
		expect(html).toContain("talk-detail-player-frame mx-auto");
		expect(html).toContain("aspect-video");
		expect(html).toContain("で 大体一体全体仏教って何でしょうかと");
		expect(html).toContain("読みやすく");
		expect(html).toContain("タイムライン付き");
		expect(html).not.toContain("文字起こしを読み込み中です。");
		expect(html).toContain("BreadcrumbList");
	});

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

	test("検索結果から来た詳細画面は検索条件付きでギャラリーへ戻る", async () => {
		const { default: TalkDetailPage } = await import("./page");

		const html = renderToStaticMarkup(
			await TalkDetailPage({
				params: Promise.resolve({ id: "TALK-V-013-1-ADC344BF78FB" }),
				searchParams: Promise.resolve({ galleryQuery: "預流果" }),
			}),
		);

		expect(html).toContain('href="/talks?query=%E9%A0%90%E6%B5%81%E6%9E%9C"');
	});

	test("ページ付きの絞り込みから来た詳細画面は同じ一覧ページへ戻る", async () => {
		const { default: TalkDetailPage } = await import("./page");

		const html = renderToStaticMarkup(
			await TalkDetailPage({
				params: Promise.resolve({ id: "TALK-V-013-1-ADC344BF78FB" }),
				searchParams: Promise.resolve({
					galleryQuery: "仏教",
					galleryCollection: "scripture_commentary",
					gallerySeries: "abhidhamma",
					galleryPage: "3",
				}),
			}),
		);

		expect(html).toContain(
			'href="/talks/page/3?query=%E4%BB%8F%E6%95%99&amp;collection=scripture_commentary&amp;series=abhidhamma"',
		);
	});

	test("詳細画面から戻るときに検索対象も引き継ぐ", async () => {
		const { default: TalkDetailPage } = await import("./page");
		const html = renderToStaticMarkup(
			await TalkDetailPage({
				params: Promise.resolve({ id: "TALK-V-013-1-ADC344BF78FB" }),
				searchParams: Promise.resolve({
					galleryQuery: "仏教",
					galleryFields: ["title", "transcript"],
				}),
			}),
		);

		expect(html).toContain(
			'href="/talks?query=%E4%BB%8F%E6%95%99&amp;fields=title&amp;fields=transcript"',
		);
	});

	test("不正な一覧ページ番号は 1 ページ目へ戻す", async () => {
		const { default: TalkDetailPage } = await import("./page");

		const html = renderToStaticMarkup(
			await TalkDetailPage({
				params: Promise.resolve({ id: "TALK-V-013-1-ADC344BF78FB" }),
				searchParams: Promise.resolve({
					galleryQuery: "仏教",
					galleryPage: "03",
				}),
			}),
		);

		expect(html).toContain('href="/talks?query=%E4%BB%8F%E6%95%99"');
		expect(html).not.toContain('href="/talks/page/3');
	});
});
