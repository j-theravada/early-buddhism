import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import TalkDetailPlayer from "./talk-detail-player";

describe("TalkDetailPlayer", () => {
	test("初期表示は既存の標準サイズにする", () => {
		const html = renderToStaticMarkup(
			<TalkDetailPlayer
				embedUrl="https://www.youtube.com/embed/example"
				thumbnailUrl="https://img.youtube.com/vi/example/hqdefault.jpg"
				talkId="TALK-1"
				title="テスト動画"
			>
				<div>本文</div>
			</TalkDetailPlayer>,
		);

		expect(html).toContain("talk-detail-player-shell relative mx-auto");
		expect(html).toContain("talk-detail-player-frame mx-auto");
		expect(html).toContain("talk-detail-player-media");
		expect(html).not.toContain('aria-label="動画サイズ"');
		expect(html).not.toContain("小さく");
		expect(html).toContain("本文");
		expect(html).toContain('src="about:blank"');
		expect(html).toContain('aria-label="テスト動画を再生"');
		expect(html).not.toContain("youtube.com/iframe_api");
	});

	test("動画がない場合も本文だけを表示する", () => {
		const html = renderToStaticMarkup(
			<TalkDetailPlayer talkId="TALK-2" title="音声のみ">
				<div>本文</div>
			</TalkDetailPlayer>,
		);

		expect(html).not.toContain('aria-label="動画サイズ"');
		expect(html).toContain("本文");
	});
});
