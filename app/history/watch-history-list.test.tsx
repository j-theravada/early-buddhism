import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { WatchHistoryEntry } from "../application/watch-history";
import { WatchHistoryEntries } from "./watch-history-list";

const unfinished: WatchHistoryEntry = {
	talkId: "TALK-UNFINISHED",
	title: "続きの法話",
	thumbnailUrl: "https://img.youtube.com/vi/unfinished/hqdefault.jpg",
	positionSeconds: 65,
	durationSeconds: 600,
	lastWatchedAt: "2026-07-26T15:30:00.000Z",
	completed: false,
};

const completed: WatchHistoryEntry = {
	talkId: "TALK-COMPLETED",
	title: "見終えた法話",
	thumbnailUrl: null,
	positionSeconds: 600,
	durationSeconds: 600,
	lastWatchedAt: "2026-07-27T01:45:00.000Z",
	completed: true,
};

const renderHistory = (entries: WatchHistoryEntry[]) =>
	renderToStaticMarkup(<WatchHistoryEntries entries={entries} />);

describe("WatchHistoryEntries", () => {
	test("履歴がないときは説明と動画一覧へのリンクを表示する", () => {
		const html = renderHistory([]);

		expect(html).toContain("視聴履歴はまだありません");
		expect(html).toContain('href="/talks"');
		expect(html).toContain("動画一覧を見る");
	});

	test("保存済みメタデータを新しい順で表示し、視聴状態に応じた詳細リンクを出す", () => {
		const html = renderHistory([unfinished, completed]);

		expect(html.indexOf("見終えた法話")).toBeLessThan(
			html.indexOf("続きの法話"),
		);
		expect(html).toContain("見終えた法話");
		expect(html).toContain("続きの法話");
		expect(html).toContain(
			'src="https://img.youtube.com/vi/unfinished/hqdefault.jpg"',
		);
		expect(html).toContain("01:05 / 10:00");
		expect(html).toContain("最終視聴: 2026年7月27日");
		expect(html).toContain("視聴済み");
		expect(html).toContain('href="/talks/TALK-UNFINISHED"');
		expect(html).toContain('href="/talks/TALK-COMPLETED"');
		expect(html).toContain("続きから再生");
		expect(html).toContain("もう一度見る");
	});
});
