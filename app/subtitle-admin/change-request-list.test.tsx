import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import SubtitleAdminChangeRequestList from "./change-request-list";

test("審査待ち字幕の現在文・修正案・承認操作を表示する", () => {
	const html = renderToStaticMarkup(
		<SubtitleAdminChangeRequestList
			initialRequests={[
				{
					id: "request-1",
					talkTitle: "法話タイトル",
					talkHref: "/talks/TALK-1?cue=7#transcript-cue-7",
					cueIndex: 7,
					startLabel: "00:00:10",
					baseText: "AIの誤変換",
					proposedText: "正しい字幕",
					reason: "固有名詞のため",
					submitterUserId: "user-1",
					createdAt: "2026-09-03T00:00:00.000Z",
				},
			]}
		/>,
	);

	expect(html).toContain("法話タイトル");
	expect(html).toContain("AIの誤変換");
	expect(html).toContain("正しい字幕");
	expect(html).toContain("承認してSRTを更新");
	expect(html).toContain("却下");
});
