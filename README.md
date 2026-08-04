# GitHub 日記ビューアー

GitHubのプライベートリポジトリにあるMarkdown日記を、ブラウザから表示する単一HTMLアプリです。

## 主な機能

- 端末時刻が午前4時より前なら、前日の日記を初期表示
- 月曜始まりの週カレンダー
- 日付をタップして日記を切り替え
- GitHub REST APIでプライベートリポジトリから取得
- 所有者、リポジトリ、ブランチ、フォルダ、ファイル名規則を設定可能
- 設定をlocalStorageへ保存
- MarkdownをHTMLへ変換
- HTMLサニタイズ

## 使い方

1. `index.html` をブラウザで開きます。
2. 設定画面で次を入力します。
   - GitHub所有者名
   - リポジトリ名
   - ブランチ名
   - 日記フォルダ
   - ファイル名テンプレート
   - Fine-grained personal access token
3. 「保存して表示」を押します。

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

Markdown変換にMarked、HTMLサニタイズにDOMPurifyをCDN経由で使用しています。
オフラインではMarkdownを装飾せず、プレーンテキストとして表示します。
