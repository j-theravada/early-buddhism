# Repository Guidelines

## 動画一覧の並び順

- `/talks` の動画一覧は、`recordedOnDate` の古い順に並べる。
- `recordedOnDate` がない動画は、日付のある動画の後に置く。
- 検索、分類による絞り込み、ページングでも、この順序を維持する。
- 並び順の基準は `app/application/talk/gallery.ts` に集約し、表示層で独自に並べ替えない。
- 並び順を変更する場合は、ユーザーの明示的な合意を得て、通常一覧と検索結果の回帰テストを更新する。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
