import { describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("../infrastructure/auth/client", () => ({
	useIsSignedIn: () => false,
}));

const {
	default: TranscriptSectionLoader,
	getInitialTranscriptMode,
	TranscriptContent,
} = await import("./transcript-section-loader");

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
			<TranscriptContent
				mode="timeline"
				status="error"
				talkId="TALK-1"
				transcript={null}
			>
				<p>消してはいけない全文</p>
			</TranscriptContent>,
		);

		expect(html).toContain("消してはいけない全文");
		expect(html).toContain("タイムラインを読み込めませんでした");
	});
});
