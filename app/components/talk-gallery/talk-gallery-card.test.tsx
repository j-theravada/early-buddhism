import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { TalkGalleryItem } from "../../domain/talk/types";
import TalkGalleryCard from "./talk-gallery-card";

const talk: TalkGalleryItem = {
	id: "TALK-1",
	dvdId: "DVD-1",
	collectionId: "monthly_talk",
	collectionLabel: "月例講演",
	seriesId: "abhidhamma",
	seriesLabel: "アビダンマ",
	title: "慈悲の実践",
	subtitle: "日々の修行",
	attachmentsLink: null,
	youtubeUrl: null,
	thumbnailUrl: null,
	recordedOnFormatted: "2026年7月17日",
	recordedOnSortValue: 20260717,
	decadeLabel: "2020年代",
	themeLabel: "慈悲",
};

describe("TalkGalleryCard", () => {
	test("一覧向けの解説制限はUnicode code points単位で100文字を境界にする", () => {
		const exactly100CodePoints = "🙂".repeat(100);
		const exactly100Html = renderToStaticMarkup(
			<TalkGalleryCard
				searchTokens={[]}
				subtitleMaxLength={100}
				talk={{ ...talk, subtitle: exactly100CodePoints }}
			/>,
		);
		expect(exactly100Html).toContain(exactly100CodePoints);
		expect(exactly100Html).not.toContain("…");

		const over100CodePoints = `${exactly100CodePoints}🙂`;
		const over100Html = renderToStaticMarkup(
			<TalkGalleryCard
				searchTokens={[]}
				subtitleMaxLength={100}
				talk={{ ...talk, subtitle: over100CodePoints }}
			/>,
		);
		expect(over100Html).toContain(`${exactly100CodePoints}…`);
		expect(over100Html).not.toContain(over100CodePoints);
	});

	test("検索ハイライトは切り詰め後の解説へ適用する", () => {
		const html = renderToStaticMarkup(
			<TalkGalleryCard
				searchTokens={["冒頭"]}
				subtitleMaxLength={100}
				talk={{
					...talk,
					subtitle: `冒頭${"あ".repeat(99)}末尾`,
				}}
			/>,
		);

		expect(html).toContain('<mark class="rounded bg-yellow-200');
		expect(html).toContain(`${"あ".repeat(98)}…`);
		expect(html).not.toContain("末尾");
	});

	test("解説制限を指定しない表示では長い解説を変更しない", () => {
		const subtitle = `${"あ".repeat(100)}末尾`;
		const html = renderToStaticMarkup(
			<TalkGalleryCard searchTokens={[]} talk={{ ...talk, subtitle }} />,
		);

		expect(html).toContain(subtitle);
		expect(html).not.toContain("…");
	});

	test("一覧のページと絞り込み条件を詳細・cue・バッジリンクへ引き継ぐ", () => {
		const html = renderToStaticMarkup(
			<TalkGalleryCard
				galleryOptions={{
					page: 3,
					query: "慈悲",
					collectionId: "scripture_commentary",
					seriesId: "sutta-pitaka",
				}}
				searchTokens={["慈悲"]}
				talk={talk}
				transcriptSnippets={[
					{
						text: "慈悲を育てます",
						cueIndex: 12,
						start: 42,
						startLabel: "00:42",
					},
				]}
			/>,
		);

		expect(html).toContain(
			'href="/talks/TALK-1?galleryQuery=%E6%85%88%E6%82%B2&amp;galleryCollection=scripture_commentary&amp;gallerySeries=sutta-pitaka&amp;galleryPage=3"',
		);
		expect(html).toContain(
			'href="/talks/TALK-1?transcriptQuery=%E6%85%88%E6%82%B2&amp;galleryQuery=%E6%85%88%E6%82%B2&amp;galleryCollection=scripture_commentary&amp;gallerySeries=sutta-pitaka&amp;galleryPage=3&amp;transcriptCue=12#transcript-cue-12"',
		);
		expect(html).toContain(
			'href="/talks?query=%E6%85%88%E6%82%B2&amp;collection=monthly_talk"',
		);
		expect(html).not.toContain(
			'href="/talks?query=%E6%85%88%E6%82%B2&amp;collection=monthly_talk&amp;series=sutta-pitaka"',
		);
		expect(html).toContain(
			'href="/talks?query=%E6%85%88%E6%82%B2&amp;collection=scripture_commentary&amp;series=abhidhamma"',
		);
	});

	test("ホーム表示ではコレクションとシリーズのバッジを span に保つ", () => {
		const html = renderToStaticMarkup(
			<TalkGalleryCard searchTokens={[]} talk={talk} />,
		);

		expect(html).toMatch(/<span[^>]*>月例講演<\/span>/);
		expect(html).toMatch(/<span[^>]*>アビダンマ<\/span>/);
		expect(html).not.toContain("月例講演で絞り込む");
		expect(html).not.toContain("アビダンマで絞り込む");
		expect(html).not.toContain("<button");
	});
});
