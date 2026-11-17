# 応募フォームとClerkの字幕管理者の同期

`scripts/google-apps-script/subtitle-admin-sync.gs` をGoogle Apps Scriptで実行する。
回答シートを読める協会のGoogleアカウントで動かすため、シートの公開やVercelの変更は不要。

対象は「初期仏教塾　管理者リスト」の `gid=1824227588` にある
「初期仏教塾アカウントのメールアドレス」列（C列）の全応募者。
Sheets APIでこの列だけを読み、見出しが変わった場合は付与前に停止する。
Clerkで同じメールアドレスを確認済みのユーザーに、
`private_metadata.role = "subtitle_admin"` を付与する。
他のメタデータはPATCHによるマージで保持する。

## 設置

1. 回答シートを読める協会の管理用Googleアカウントで [Apps Script](https://script.google.com/) に入り、
   **独立した新しいプロジェクト**を作る。プロジェクトの編集権限はClerkの管理担当者に限定する。
   回答シートに紐付けたスクリプトでは、シートの編集者にもClerkの秘密鍵へのアクセスを与えてしまう。
2. `subtitle-admin-sync.gs` の内容を `Code.gs` に貼り付け、保存する。
   「プロジェクトの設定」でマニフェストファイルの表示を有効にし、
   `appsscript.json` を `scripts/google-apps-script/appsscript.json` の内容に置き換える。
   Google側の権限をシートの読み取り、外部API接続、トリガーの管理に限定する。
   マニフェストで高度なGoogle Sheetsサービスも有効になる。
   Apps Script標準のGoogle Cloudプロジェクトでは、対応APIも自動で有効になる。
3. 「プロジェクトの設定」→「スクリプト プロパティ」に `CLERK_SECRET_KEY` を追加する。
   値にはClerkの **early-buddhism / Production** のSecret Keyを設定する。
   鍵をコード、回答シート、実行ログ、リポジトリには書かない。
4. `installSubtitleAdminSync` を一度実行し、Googleの認可画面で内容を確認して許可する。
   既存応募者を同期した後、5分ごとのトリガーを作成する。
   同じアカウントで再実行してもトリガーは重複しない。
5. 実行結果の `granted`、`awaitingRegistration`、`invalid` を確認する。
   トリガー画面に `syncSubtitleAdministrators` の時間主導型・5分おきが1件あることを確認する。

応募者は5分ごとの同期で付与される。
応募したメールアドレスでアカウントを作成し、Clerkでそのメールが確認済みになると、次の同期で付与される。
不正な形式の回答は除外して `invalid` に件数を記録し、他の応募者の同期を続ける。
`invalid` が0より大きい場合は回答シートのC列を確認し、該当行を訂正する。
API障害やレート制限で途中失敗しても、次の同期で未付与分を再試行する。
ログには件数とHTTPステータスだけを出す。

この同期は付与のみを行う。権限を取り消す場合は、先に対象の応募行を除外し、
Clerkのprivate metadataから `role` を取り除く。
同期を止める場合は、Apps Scriptのトリガー画面で上記1件を削除する。

## 本番の設置先

- プロジェクト: [初期仏教塾 字幕管理者の自動同期](https://script.google.com/u/3/home/projects/1yxGjHuNWASTXUtZ1p1Ej3SkaQMxKzVrYtO2sC0WTR-WskMxJ2PcZ2Grh/edit)
- 実行者・所有者: 協会の管理用Googleアカウント。本人のみアクセス可能で、一般アクセスは制限付き。
- Clerk: `early-buddhism / Production`。専用キー `subtitle-admin-apps-script` は非公開のScript Propertiesに保存。
- 2026-11-17 18:21 JST: `installSubtitleAdminSync` の実行完了を確認。
  結果は `applicants: 6, granted: 0, awaitingRegistration: 2`。登録済みの4名は付与済み。
- 同じ設置関数を再実行した後も、`syncSubtitleAdministrators` の時間主導型・5分おきは1件のみ。
- 2026-11-17 18:22:13 JST: 更新後の `syncSubtitleAdministrators` が時間主導型で起動し、
  2.168秒で「完了」になったことを実行履歴で確認。
- 2026-11-17 18:50 JST: 不正な回答だけを除外する修正版を保存し、`installSubtitleAdminSync` の正常終了を確認。
  結果は `applicants: 6, invalid: 0, granted: 0, awaitingRegistration: 2`。

読み取り権限を維持するため、運用は5分ごとの同期のみとする。
Google側のコードもリポジトリと同じ時間トリガーのみの実装を使用する。

## 同期とアプリ側の責務

同期の付与条件は
[`syncSubtitleAdministrators`](../scripts/google-apps-script/subtitle-admin-sync.gs#L48) に集約する。
[`installSubtitleAdminSync`](../scripts/google-apps-script/subtitle-admin-sync.gs#L115) は
初回に同じ関数を呼び、同じ関数名の時間トリガーがなければ5分おきを1件作成する。
定期トリガーも `syncSubtitleAdministrators` を直接実行するため、初回と定期で付与条件は変わらない。

アプリのロール判定は
[`hasSubtitleAdminRole`](../app/application/auth/subtitle-admin.ts#L5) が所有し、
[`currentUserIsSubtitleAdmin`](../app/infrastructure/auth/server.ts#L4) がClerkのprivate metadataを渡す。
このサーバー関数を使う
[管理画面layout](../app/subtitle-admin/layout.tsx#L12) は未認証をログインへ送り、権限不足なら404にする。
[字幕修正の審査API](../app/api/subtitle-admin/change-requests/[id]/route.ts#L44) は、
未認証を401、権限不足を403で拒否してから更新処理へ進む。
[アクセス確認API](../app/api/subtitle-admin/access/route.ts#L19) は未認証を401にし、
認証済みには同じロール判定の真偽値だけをキャッシュせず返す。
Apps Scriptは別の実行環境のため、アプリの判定関数をimportせず、同じロール値をClerkに書き込む。

参考: [Clerkのメタデータ更新](https://clerk.com/docs/reference/backend/user/update-user-metadata)、
[Googleのインストール型トリガー](https://developers.google.com/apps-script/guides/triggers/installable)、
[スクリプト プロパティ](https://developers.google.com/apps-script/guides/properties)。
