# English Phrase

## これは何か

自分専用の英単語・英フレーズ学習Webアプリ。Notion で管理している英単語帳をデータソースとして、スマートフォンからランダムに1件ずつ出題し、意味・例文・音声を確認しながら反復学習する。Cloudflare スタックの無料枠で完結する個人開発前提のアプリ。

## ターゲットユーザー

- アプリ作者本人（個人利用）
- Cloudflare Access で許可した特定メールアドレスのみアクセス可能
- スマートフォン（ホーム画面追加）からの利用が想定。PC からは見ない

## MVPでやること

### 学習データの管理

- Notion DB（DB_単語帳）を「単語・意味・品詞・例文・例文訳・作成日時」のスキーマで管理する
- `pnpm sync` または GitHub Actions（毎日 04:00 JST）で Notion → Cloudflare D1 に差分同期する
- 初回は全件登録、2回目以降は `last_edited_time` で差分のみ UPSERT する
- Notion 側の削除は無視し、D1 には残し続ける

### 学習フロー

- スタート画面で「Start」ボタンをタップ → クイズ画面へ遷移
- クイズ画面はランダムに1件取得し、英単語のみを表示
- 「Answer」ボタンで意味・品詞・例文を表示
- 「Next」ボタンで次の単語を取得
- 「Finish」ボタンを画面右上に常時表示 → 結果画面へ遷移
- 結果画面では今日確認した単語の一覧と件数を表示
- リロードでホームに戻る（セッションは揮発）

### 音声読み上げ

- クイズ画面の voice ボタンで `word` の英語音声を再生
- OpenAI Text-to-Speech API（`gpt-4o-mini-tts`、voice: `coral`）で生成
- 生成済み mp3 は Cloudflare R2 にキャッシュし、2回目以降は OpenAI を呼ばない
- 連打防止のため生成中・再生中はボタンを disabled にする

### 認証

- Cloudflare Access（Zero Trust）でドメイン全体（`english-phrase.work/*`）を保護
- 許可メールアドレスのみログイン可能
- Worker は `workers_dev = false` で workers.dev URL を閉鎖し、独自ドメイン経由のみアクセス可能にする

### 運用

- `main` ブランチへの push で API・Web が GitHub Actions により自動デプロイされる
- DB マイグレーションはスキーマ変更時のみ手動実行（自動化対象外）

## やらないこと

- ユーザー登録・複数ユーザー対応（個人利用のため）
- 学習履歴・正答率・SRS（間隔反復学習）などの学習管理機能
- Notion 側削除データの追従（D1 では残す）
- 例文の音声読み上げ（対象は `word` のみ）
- PWA 化・オフライン対応
- PC 向けレイアウト最適化（スマホ専用）

## 非機能要件

- **無料運用**: Cloudflare Workers / D1 / R2 / Access の無料枠内で運用する
- **コスト管理**: OpenAI API の月額上限を $5〜$10 に設定する。R2 キャッシュで再生成を抑える
- **CORS**: フロントと API は `english-phrase.work` の同一オリジン構成（Worker Route で `/api/*` を分離）にすることで CORS を回避する
- **シークレット**: OpenAI API キーは Worker Secret に保存し、フロントエンドには露出させない
- **モバイル UX**: safe-area-inset 対応、タッチターゲット高さ確保（`h-14` 相当）

## 成功指標

- 毎朝 Notion → D1 同期が自動で成功している（GitHub Actions が緑）
- 毎日スマートフォンから問題なく学習できる
- 単語追加〜学習画面反映までの手作業がゼロ（Notion で編集するだけ）
- 音声再生のうち 2 回目以降は R2 キャッシュから返り、OpenAI 呼び出しが発生しない

## 技術スタック

- **Runtime**: Node.js >= 24.0.0 / TypeScript 5.x
- **Package Manager**: pnpm 11.x（workspace モノレポ）
- **Database**: Cloudflare D1（SQLite）+ Drizzle ORM / drizzle-kit
- **API**: Cloudflare Workers + Hono v4
- **Frontend**: Vite + React 19 + TanStack Router + shadcn/ui + Tailwind CSS 4
- **音声合成**: OpenAI TTS API（`gpt-4o-mini-tts`） + Cloudflare R2 キャッシュ
- **認証**: Cloudflare Access（Zero Trust）
- **CI/CD**: GitHub Actions（自動 Sync・自動 Deploy）
- **テスト**: Vitest
- **Lint/Format**: Biome
