import { expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("../infrastructure/auth/client", () => ({
	getSubtitleAdminAccess: async () => false,
	useIsSignedIn: () => false,
}));

const { default: SubtitleAdminChangeRequestList } =
	await import("./change-request-list");

test("審査状態タブ・申請者・審査結果を表示する", () => {
	const html = renderToStaticMarkup(
		<SubtitleAdminChangeRequestList
			currentReviewer={{
				displayName: "管理 太郎",
				emailAddress: "admin@example.com",
			}}
			initialRequests={[
				{
					id: "request-1",
					talkId: "TALK-1",
					talkTitle: "法話タイトル",
					talkHref: "/talks/TALK-1?cue=7#transcript-cue-7",
					cueIndex: 7,
					startLabel: "00:00:10",
					embedUrl: "https://www.youtube.com/embed/example",
					thumbnailUrl: "https://img.youtube.com/vi/example/hqdefault.jpg",
					playbackUrl:
						"https://www.youtube.com/embed/example?start=10&autoplay=1",
					baseText: "AIの誤変換",
					proposedText: "正しい字幕",
					reason: "固有名詞のため",
					submitter: {
						displayName: "申請 太郎",
						emailAddress: "submitter@example.com",
					},
					status: "pending",
					createdAt: "2026-09-03T00:00:00.000Z",
					reviewer: null,
					reviewedAt: null,
					reviewNote: null,
				},
				{
					id: "request-2",
					talkId: "TALK-2",
					talkTitle: "承認済み法話",
					talkHref: "/talks/TALK-2?cue=3#transcript-cue-3",
					cueIndex: 3,
					startLabel: "00:01:00",
					embedUrl: null,
					thumbnailUrl: null,
					playbackUrl: null,
					baseText: "旧字幕",
					proposedText: "承認された字幕",
					reason: null,
					submitter: {
						displayName: "申請 花子",
						emailAddress: null,
					},
					status: "approved",
					createdAt: "2026-09-02T00:00:00.000Z",
					reviewer: {
						displayName: "管理 太郎",
						emailAddress: "admin@example.com",
					},
					reviewedAt: "2026-09-03T01:00:00.000Z",
					reviewNote: "音声で確認済み",
				},
				{
					id: "request-3",
					talkId: "TALK-3",
					talkTitle: "却下済み法話",
					talkHref: "/talks/TALK-3?cue=4#transcript-cue-4",
					cueIndex: 4,
					startLabel: "00:02:00",
					embedUrl: null,
					thumbnailUrl: null,
					playbackUrl: null,
					baseText: "音声どおりの字幕",
					proposedText: "誤った修正案",
					reason: null,
					submitter: {
						displayName: "申請 次郎",
						emailAddress: null,
					},
					status: "rejected",
					createdAt: "2026-09-01T00:00:00.000Z",
					reviewer: {
						displayName: "管理 太郎",
						emailAddress: "admin@example.com",
					},
					reviewedAt: "2026-09-03T02:00:00.000Z",
					reviewNote: "音声どおりのため",
				},
			]}
		/>,
	);

	expect(html).toContain("法話タイトル");
	expect(html).toContain("AIの誤変換");
	expect(html).toContain("正しい字幕");
	expect(html).toContain("審査待ち");
	expect(html).toContain("承認済み");
	expect(html).toContain("却下済み");
	expect(html).toContain("申請者: 申請 太郎");
	expect(html).toContain("submitter@example.com");
	expect(html).toContain("承認された字幕");
	expect(html).toContain("審査者: 管理 太郎");
	expect(html).toContain("音声で確認済み");
	expect(html).toContain("音声どおりのため");
	expect(html).toContain("talk-detail-player-media");
	expect(html).toContain(
		'href="https://www.youtube.com/embed/example?start=10&amp;autoplay=1"',
	);
	expect(html).toContain(">00:00:10</a>");
	expect(html).toContain("承認して字幕を更新");
	expect(html).toContain("却下");
});
