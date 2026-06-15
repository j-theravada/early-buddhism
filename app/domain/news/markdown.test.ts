import { describe, expect, test } from "bun:test";
import { parseNewsMarkdown } from "./markdown";

describe("parseNewsMarkdown", () => {
	test("Markdownのお知らせを表示用データに変換する", () => {
		const result = parseNewsMarkdown(
			`---
title: "初期仏教塾をオープンしました"
date: 2025-12-31
slug: site-open
draft: false
---

日本テーラワーダ仏教協会は、当ウェブサイトをオープンしました。

第一弾として、動画300本を無料公開！`,
			"fallback-slug",
		);

		expect(result).toEqual({
			title: "初期仏教塾をオープンしました",
			date: "2025-12-31",
			slug: "site-open",
			body: "日本テーラワーダ仏教協会は、当ウェブサイトをオープンしました。\n\n第一弾として、動画300本を無料公開！",
			excerpt:
				"日本テーラワーダ仏教協会は、当ウェブサイトをオープンしました。 第一弾として、動画300本を無料公開！",
			draft: false,
		});
	});

	test("slugが未指定ならファイル名由来のslugを使う", () => {
		const result = parseNewsMarkdown(
			`---
title: テスト
date: 2026-01-01
---

本文`,
			"file-name",
		);

		expect(result.slug).toBe("file-name");
	});
});
