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
	});

	test("旧クライアントギャラリーでは callback 付きバッジを button に保つ", () => {
		const html = renderToStaticMarkup(
			<TalkGalleryCard
				onSelectCollection={() => {}}
				onSelectSeries={() => {}}
				searchTokens={[]}
				talk={talk}
			/>,
		);

		expect(html).toContain('<button aria-label="月例講演で絞り込む"');
		expect(html).toContain('<button aria-label="アビダンマで絞り込む"');
	});
});
