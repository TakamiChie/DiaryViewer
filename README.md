# GitHub 日記ビューアー

GitHubのプライベートリポジトリにあるMarkdown日記を、ブラウザから表示する単一HTMLアプリです。

## 主な機能

- 端末時刻が午前4時より前なら、前日の日記を初期表示
- 月曜始まりの週カレンダー
- 日付をタップして日記を切り替え
- GitHub REST APIでプライベートリポジトリから取得
- 所有者、リポジトリ、ブランチ、日記・添付フォルダ、ファイル名規則を設定可能
- 設定をlocalStorageへ保存
- MarkdownをHTMLへ変換
- Mermaidコードブロックを図として描画
- `![[画像・音声ファイル]]` をGitHub上の個別表示リンクへ変換
- 日付横または本文見出し横のTOCからMarkdown内の見出しへジャンプ
- HTMLサニタイズ
- ホーム画面への追加に対応したPWA
- 一度読み込んだ画面と日記をオフラインでも表示

## 使い方

1. HTTPSで配信されたページをブラウザで開きます。
2. 設定画面で次を入力します。
   - GitHub所有者名
   - リポジトリ名
   - ブランチ名
   - 日記フォルダ
   - 添付ファイルフォルダ（日記ファイルのあるフォルダからの相対パス）
   - ファイル名テンプレート
   - Fine-grained personal access token
3. 「保存して表示」を押します。

### ホーム画面への追加

ブラウザのメニューから「ホーム画面に追加」または「アプリをインストール」を選択すると、
日記ビューアーを単独のアプリとして起動できます。PWA機能を利用するには、GitHub Pagesなどの
HTTPS環境（ローカル開発時はlocalhost）で配信してください。

既定のファイル名は `YYYY-MM-DD.md` です。

### ファイル名テンプレート

- `{YYYY}`: 4桁年
- `{YY}`: 2桁年
- `{MM}`: 2桁月
- `{M}`: 1～2桁月
- `{DD}`: 2桁日
- `{D}`: 1～2桁日

例:

- `{YYYY}-{MM}-{DD}.md`
- `{YYYY}/{MM}/{YYYY}-{MM}-{DD}.md`
- `{YYYY}{MM}{DD}.md`

テンプレートに `/` を含めれば、日付ごとのサブフォルダも指定できます。

添付ファイルフォルダにも同じ日付タグを使用できます。既定値は
`attachment_files` です。空欄にすると日記ファイルと同じフォルダを参照します。

## GitHubトークン

Fine-grained personal access tokenを作り、次の範囲だけを許可してください。

- Repository access: 対象の日記リポジトリのみ
- Repository permissions:
  - Contents: Read-only

## セキュリティ上の注意

この簡易版はトークンをブラウザのlocalStorageに保存します。

- 自分専用の端末だけで使用してください。
- GitHub Pagesなど、不特定多数がアクセスする場所へ設定済み状態で公開しないでください。
- ブラウザ拡張機能や同一オリジン上の別スクリプトから、localStorageを読み取られる可能性があります。
- より安全に運用する場合は、Cloudflare Workers、Azure Functions、Netlify Functionsなどの中継APIを設け、トークンをブラウザに置かない構成にしてください。

## 補足

Markdown変換にMarked、HTMLサニタイズにDOMPurify、図の描画にMermaidをCDN経由で使用しています。
オフラインではMarkdownを装飾せず、プレーンテキストとして表示します。
