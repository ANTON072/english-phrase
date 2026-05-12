# 開発ガイドライン (Development Guidelines)

このプロジェクトは個人開発のため、組織的な大規模ルールではなく **長く運用しても破綻しないための実用的な約束** を中心にまとめる。実装時はまずこのファイルと `docs/repository-structure.md` を確認すること。

## 開発の基本フロー

CLAUDE.md に従う:

1. **ドキュメント作成**: 永続ドキュメント (`docs/`) で「何を作るか」を定義
2. **作業計画**: ステアリングファイル (`.steering/[YYYYMMDD]-[task-name]/`) で「今回何をするか」を計画
3. **実装**: `tasklist.md` に沿って実装し、進捗を随時更新
4. **検証**: テストと動作確認
5. **更新**: 必要に応じてドキュメント更新

`/setup-project` は初回のみ。日常は `/add-feature [機能名]` で個別作業に入る。実装前には CLAUDE.md → 関連 docs → Grep で類似実装を確認、の順で前提を揃える。

## コーディング規約

### TypeScript / JavaScript

#### 命名

| 種別                          | 規則                | 例                                         |
| ----------------------------- | ------------------- | ------------------------------------------ |
| 変数・関数                    | camelCase / 動詞始まり | `fetchPhrase`, `startSession`, `parsePartOfSpeech` |
| 型・型エイリアス              | PascalCase          | `PhraseResponse`, `SpeechRequest`, `PageState` |
| 定数（モジュールトップ）     | UPPER_SNAKE_CASE    | `API_ENDPOINT`, `MAX_TEXT_LENGTH`, `MODEL`, `VOICE` |
| Boolean                       | `is*` / `has*` / `should*` | `isStarted`, `mountedRef`            |
| React コンポーネント          | PascalCase          | `QuizCard`, `ErrorMessage`                 |
| React フック                  | `use*` (camelCase)  | `usePhrase`, `useVoice`                    |
| ファイル名                    | 原則 kebab-case。例外は repository-structure.md 参照 | `escape.ts`, `QuizCard.tsx` |

#### 型の使い方

- `any` を書かない。外部入力など型が不明な箇所は `unknown` で受けてから絞り込む（`apps/api/src/routes/speech.ts` の `parseBody` 参照）。
- 関数の戻り値は基本的に推論に任せる。公開エクスポート（`packages/types`, ライブラリ境界）は明示する。
- `interface` ではなく `type` を使う（既存コードに合わせる）。
- API ↔ Web の型は **必ず `packages/types/` で共有**。同じ型を両側で再定義しない。

#### コードフォーマット（Biome）

`biome.json` の設定が唯一の真実。手動で整形しない。

| 項目         | 設定値                |
| ------------ | --------------------- |
| インデント    | スペース 2            |
| 行長         | 100                   |
| クォート     | ダブルクォート        |
| 末尾カンマ   | ES5 (関数引数は付けない) |

- 実装前: 必要に応じて `pnpm format` でローカル整形
- コミット前: `pnpm check`（lint + format + import 整列を一括実行）

#### コメント

CLAUDE.md（プロジェクト指示）の通り、デフォルトはコメント無し。書く価値があるのは:

- **コードベース外の知識**: 製品仕様、外部 API のマジック値、ドキュメント化されていない挙動。例: `apps/api/src/services/speech.ts` の `MODEL` / `VOICE` 定数の選定理由は仕様書側にあるためコードからは読み取れない。
- **非自明な意図**: なぜここで `AbortController` を使うか、なぜ R2 `put` 失敗を握りつぶすか、など読み手が見落としやすい設計判断。

書かないもの:

- コードを翻訳しただけのコメント（`// キャッシュをクリア` のような）
- 「このフィックスは Issue #N」「〇〇関数から呼ばれる」など PR 本文や git log に書くべき内容
- 完成すれば自明な手順説明

#### エラーハンドリング

- **境界で検証、内部は信頼**: HTTP 入力（`apps/api/src/routes/speech.ts`）、Notion レスポンス、`process.env` などシステム境界で厳格に検証する。内部のヘルパー関数では引数の型を信頼する。
- **エラーを握りつぶさない**: 例外は適切な型で再 throw するか、ユーザー向けの UI フィードバックに変換する。
- **キャッシュ操作の失敗は劣化扱い**: R2 `put` 失敗は console.error で記録し、生成済み mp3 はそのまま返す（`services/speech.ts`）。学習機能本体を止めない。
- **副作用が失敗しうるところでは「成功してから状態を進める」**: `apps/sync` の `sync_logs` 更新は `wrangler d1 execute` 成功後にのみ行う。失敗時は次回も同じ境界からリトライ可能にする。
- **AbortError は無視**: `usePhrase` / `useVoice` の中で意図的にリクエストをキャンセルする箇所。AbortError をエラー UI に変換しない。

## ファイル配置 & 依存ルール

詳細は `docs/repository-structure.md`。守るべき重要原則のみ:

- **副作用は service 層 / hook 層に集約**。route / component から直接外部 API を呼ばない。
- **`apps/*` 同士で import しない**。共有が必要なら `packages/types` か `packages/db` に切り出す。
- **`apps/web` から `packages/db` を import しない**（D1 スキーマはサーバ専用）。
- **生成ファイルを手動編集しない**: `src/routeTree.gen.ts`、`migrations/*.sql`、`public/mockServiceWorker.js`、`components/ui/*`（shadcn 生成）。
- **shadcn コンポーネントの追加**は `shadcn` CLI 経由で行う（手書きしない）。

## Git 運用

### ブランチ戦略

シンプル運用。`main` から個別ブランチを切り、PR でマージ。

| パターン        | 用途                              |
| --------------- | --------------------------------- |
| `feature/[内容]` | 新機能・スペック作業              |
| `fix/[内容]`    | バグ修正                          |
| `refactor/[内容]` | リファクタリング                |
| `chore/[内容]`  | ビルド・設定・依存更新            |

- **ブランチ名の再使用禁止**（CLAUDE.md グローバル指示）。
- マージは通常マージ（squash しない）。マージ時にトピックブランチを削除。
- `main` 直接 push は禁止（GitHub Actions が `main` に反応して自動デプロイするため）。

### コミット

- Conventional Commits 風に **type: 内容** を意識する。type は `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`。
- **`--amend` と force push は明示許可された時のみ**（CLAUDE.md グローバル指示）。
- Co-Authored-By を残してよい（このリポジトリでは Claude 共同編集が普通）。

例:

```
feat: 音声再生中のボタン表示状態を整える
fix: sync_logs 未作成時に初回扱いとして処理を続行する
refactor: QuestionCard と AnswerCard を PhraseCard に統合
chore: pnpm v11 対応のビルド許可設定を更新
```

### Pull Request

- ローカルで `pnpm check` と `pnpm test` を通してから PR を作成する。
- PR 本文には「概要」「変更内容」「動作確認方法」を最低限書く。スクリーンショット・録画は UI 変更時のみ。
- GitHub Actions の `Deploy to Production` が main 押下時に走るため、**main へのマージ前にローカルで `pnpm release` 相当の差分が壊れていないか確認**する（特に Workers 設定・bindings 周り）。

## テスト戦略

### Vitest の対象

ユニットテストは **副作用を持たない純粋関数** を中心に書く。Workers バインディング・D1・OpenAI を mock してまで広範に書かない（過剰投資にならないライン）。

現状のカバレッジ対象:

- `apps/sync/src/escape.test.ts` — SQL エスケープ
- `apps/api/src/services/speech.test.ts` — ハッシュ・キャッシュキー生成

追加時の指針:

- service 層に副作用を切り出した後、入力 → 出力の純粋関数として書ける単位をテストする。
- ルートハンドラの結合テストを書くなら、`hono` の `app.request()` で D1 を `wrangler dev` の `--local` 経由で当てるよりは、サービス層を呼び分けるラッパーをモック化する。

### テスト命名

- `describe` は対象関数名、`it` は日本語で「条件 + 期待結果」を 1 文で書く。`escape.test.ts` の既存スタイルに合わせる。

```typescript
describe("esc", () => {
  it("シングルクォートを '' にエスケープする", () => { ... });
});
```

### 手動 / E2E

UI と Workers バインディングの結合は手動確認に依存する。CLAUDE.md グローバル指示の通り **ユニットテスト単独では視覚的な正確性を証明できない**ため、UI/CSS 変更は実機（スマートフォン）で必ず確認する。

- ローカル: `pnpm dev` → `http://localhost:5173` を Safari Web Inspector でスマートフォン表示確認
- 音声: 1 回目で OpenAI、2 回目で R2 ヒットを Network タブで確認
- 本番: `https://english-phrase.work` に Cloudflare Access ログイン → 学習フロー → Finish → 結果画面まで一通り

## コードレビュー

### 自己レビュー（PR 作成前）

- [ ] `pnpm check` で lint・format・import 整列が通る
- [ ] `pnpm test` で Vitest が通る
- [ ] `pnpm web:build` で TypeScript の型チェックが通る（`tsc -b` 込み）
- [ ] UI 変更を実機 / Web Inspector のスマホエミュレートで動作確認した
- [ ] シークレットや個人情報（メールアドレス・実 D1 ID 以外）を含めていない

### 観点

- **責務分離**: route / service / hook / component の役割が混ざっていないか
- **境界の検証**: 外部入力を信頼していないか（`unknown` → 型ガード）
- **エラー伝播**: 例外を握りつぶしていないか。逆に握りつぶすべき場所（R2 put 失敗）で過剰に止めていないか
- **生成物編集**: 生成ファイル（`*.gen.ts`、`migrations/*.sql`、`components/ui/*`）に手を入れていないか
- **依存方向**: `docs/repository-structure.md` の依存ルールに違反していないか

## 開発環境セットアップ

### 必要なツール

| ツール                | バージョン | インストール                              |
| --------------------- | ---------- | ----------------------------------------- |
| Node.js               | >= 24.0.0  | `.node-version` を見て nodenv / fnm 等で  |
| pnpm                  | 11.1.0     | `corepack enable && corepack prepare pnpm@11.1.0 --activate` |
| Wrangler              | catalog: ^4 | `pnpm install` で入る                    |
| Cloudflare アカウント | -          | `npx wrangler login` で認証               |
| OpenAI アカウント     | -          | API キー発行 + 月額上限設定               |
| Notion インテグレーション | -      | API キー発行 + DB へのアクセス権付与      |

### セットアップ手順

```bash
# 1. クローン
git clone https://github.com/ANTON072/english-phrase.git
cd english-phrase

# 2. 依存インストール
pnpm install

# 3. Cloudflare ログイン
npx wrangler login

# 4. D1 データベース作成（初回のみ）
npx wrangler d1 create english-phrase-db

# 5. マイグレーション適用（リモート / ローカル両方）
pnpm db:migrate              # 本番 D1
pnpm db:migrate:local        # wrangler dev 用ローカル SQLite

# 6. 環境変数
cp .env.example .env
# .env を編集（NOTION_API_KEY / NOTION_DATABASE_ID / CLOUDFLARE_API_TOKEN /
# CLOUDFLARE_ACCOUNT_ID / CF_D1_DATABASE_ID / D1_DB_NAME / OPENAI_API_KEY）

# 7. OpenAI API キーを Worker Secret に登録（本番 API 用）
npx wrangler secret put OPENAI_API_KEY --name english-phrase-api
```

### よく使うコマンド

| 用途                         | コマンド                            |
| ---------------------------- | ----------------------------------- |
| ローカル開発（3 サーバ並列）  | `pnpm dev`                          |
| Notion → 本番 D1 同期        | `pnpm sync`                         |
| Notion → ローカル D1 同期    | `pnpm sync:local`                   |
| テスト                       | `pnpm test`                         |
| Lint / Format チェック+修正  | `pnpm check`                        |
| Web の型チェック+ビルド      | `pnpm web:build`                    |
| 本番デプロイ（API + Web 並列）| `pnpm release`                     |
| API のみデプロイ             | `pnpm api:deploy`                   |
| Web のみデプロイ             | `pnpm web:deploy`                   |
| Drizzle Studio              | `pnpm db:studio`                    |
| スキーマ変更 → マイグレ生成 | `pnpm db:generate`                  |
| Storybook                    | `pnpm storybook`                    |

### 推奨開発ツール

- **VSCode** + Biome 拡張（フォーマット・Lint 表示）
- **Drizzle Studio**（`pnpm db:studio`）— ローカル / リモート D1 の中身を視覚的に確認
- **Safari Web Inspector**（macOS）— スマートフォン実機デバッグ
- **Cloudflare Dashboard**（D1 / R2 / Access 設定確認）
- **Notion Web**（DB スキーマ確認）

## 安全性

- `rm -rf` は相対パス（`./path`）または絶対パス（`/Users/.../...`）のみ。`/` だけや `~/` は使わない。
- 一時ファイル（`apps/sync/output.sql`、ワークツリーのプロンプトファイル）は `__inbox/`（gitignored）に置く。
- `.env` を絶対にコミットしない。`.env.example` で例だけを共有する。
- スキーマ破壊的変更は `DELETE FROM sync_logs;` とセットで実行する（境界が古いままだと再同期が機能しない）。
- 本番 Worker の `wrangler.toml` の `database_id` を編集する場合は、`workers_dev = false` が残っていることを確認する（Access 迂回防止）。

## 自動化（GitHub Actions）

- `.github/workflows/sync.yml` — 毎朝 04:00 JST に `pnpm sync:ci` を実行。失敗したら GitHub からメール通知が来る。
- `.github/workflows/deploy.yml` — `main` への push で `pnpm release`（API + Web の並列デプロイ）を実行。
- Secrets は GitHub の Settings > Secrets and variables > Actions で管理する。リポジトリにはコミットしない。
- ワークフロー側のスケジュール変更時は cron が UTC である点に注意（JST 04:00 = UTC 19:00）。

## トラブルシューティング

| 症状                                            | 対応                                                                                     |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm sync` が `no such table` で続行する        | 初回扱い。`sync_logs` テーブル未作成のため。`pnpm db:migrate` を先に実行する             |
| `wrangler d1 execute` で「テーブルが既にある」 | `db:migrate` を 2 回叩いている可能性。スキーマ変更時のみ実行する                         |
| 音声が再生されない                              | DevTools Network で `/api/v1/speech` のレスポンスを確認。502 なら OpenAI API キーを確認 |
| 同じ単語ばかり出る                              | `usePhrase` の重複防止は 1 回のみ。レコード数が少ない場合は確率上避けられない           |
| ローカルで `/api/*` が 404                      | Vite のプロキシ設定を確認。`pnpm api:dev` が 8787 で起動しているか確認                  |
| Storybook が起動しない                          | `pnpm install` で `playwright` のブラウザバイナリを許可しているか確認                   |
