# Repository Guidelines

## 動画一覧の並び順

- `/talks` の動画一覧は、`recordedOnDate` の古い順に並べる。
- `recordedOnDate` がない動画は、日付のある動画の後に置く。
- 検索、分類による絞り込み、ページングでも、この順序を維持する。
- 並び順の基準は `app/application/talk/gallery.ts` に集約し、表示層で独自に並べ替えない。
- 並び順を変更する場合は、ユーザーの明示的な合意を得て、通常一覧と検索結果の回帰テストを更新する。
