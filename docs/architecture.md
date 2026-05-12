# 技術仕様書 (Architecture Design Document)

## テクノロジースタック

### 言語・ランタイム

| 技術       | バージョン | 備考                                       |
| ---------- | ---------- | ------------------------------------------ |
| Node.js    | >= 24.0.0  | ローカル開発と CI で使用                   |
| TypeScript | ^5.8.3     | `pnpm-workspace.yaml` の catalog で固定    |
| pnpm       | 11.1.0     | `package.json` の `packageManager` で固定 |

### フレームワーク・ライブラリ

#### apps/sync

| 技術                  | バージョン | 用途                              | 選定理由                                                          |
| --------------------- | ---------- | --------------------------------- | ----------------------------------------------------------------- |
| `@notionhq/client`    | ^2.0.0     | Notion DB クエリ                  | 公式 SDK。`databases.query` の filter / ページネーション対応      |
| `tsx`                 | ^4.0.0     | TypeScript 直接実行 (Node 上)     | コンパイル無しで実行できる。`--env-file` で `.env` を読める       |
| `drizzle-orm`         | ^0.44.0    | `NewPhrase` 型のインポート        | Drizzle スキーマからの型生成のみに利用。実行時の DB アクセスは持たない |
| `wrangler`            | ^4.0.0     | D1 への SQL 適用 (`execFileSync`) | Cloudflare 公式 CLI。ローカル/リモート両方の D1 を扱える          |

#### apps/api

| 技術                      | バージョン | 用途                            | 選定理由                                          |
| ------------------------- | ---------- | ------------------------------- | ------------------------------------------------- |
| `hono`                    | ^4.0.0     | Workers 向け Web フレームワーク | 軽量・型安全・Workers Bindings ファーストクラス   |
| `drizzle-orm`             | ^0.44.0    | D1 クエリ (`drizzle-orm/d1`)    | 型安全。SQLite SQL を吐ける                       |
| `@cloudflare/workers-types` | ^4.0.0   | Workers ランタイムの型          | D1Database / R2Bucket などのバインディング型      |

#### apps/web

| 技術                     | バージョン | 用途                            | 選定理由                                                                 |
| ------------------------ | ---------- | ------------------------------- | ------------------------------------------------------------------------ |
| `react` / `react-dom`    | ^19.1.0    | UI                              | プロジェクトポリシー（React 公式の推奨実装に従う）                       |
| `@tanstack/react-router` | ^1.114.3   | ファイルベースルーティング      | `beforeLoad` で認可ガード、コード分割、型安全なリンク                    |
| `@tanstack/react-query`  | ^5.74.4    | サーバ状態ライブラリ            | Router の Context で共有。現状の API 呼び出しは hooks 直書きだが将来用に保持 |
| `radix-ui` + `shadcn`    | latest     | アクセシブルな UI プリミティブ  | スマホ操作に最適化された Badge / Button などを内製                       |
| `tailwindcss`            | ^4.1.3     | スタイル                        | shadcn の前提。Tailwind 4 + `@tailwindcss/vite` を採用                    |
| `lucide-react`           | ^0.487.0   | アイコン                        | PRD で指定 (Lucide)                                                      |
| `sonner`                 | ^2.0.7     | Toast 通知                      | 音声エラーをユーザーへ通知する用途                                       |
| `class-variance-authority` / `clsx` / `tailwind-merge` | - | クラス組み立て | shadcn の標準セット                                            |
| `vite`                   | ^6.3.1     | 開発サーバ・バンドラ            | `wrangler` の Static Assets と組み合わせやすい                           |

#### packages/db

| 技術          | バージョン | 用途                          | 選定理由                                                |
| ------------- | ---------- | ----------------------------- | ------------------------------------------------------- |
| `drizzle-orm` | ^0.44.0    | スキーマ定義 (`schema.ts`)    | 単一の SoT、型生成、D1 ドライバ                         |
| `drizzle-kit` | ^0.30.0    | マイグレーション SQL 自動生成 | `pnpm db:generate`、Drizzle Studio                      |

### 外部サービス

| サービス                       | 用途                                | 課金区分                          |
| ------------------------------ | ----------------------------------- | --------------------------------- |
| Cloudflare Workers             | API ホスティング                    | 無料枠（1日 10 万リクエスト想定） |
| Cloudflare Workers Static Assets | Web フロント配信                  | 無料枠                            |
| Cloudflare D1                  | SQLite データベース                 | 無料枠                            |
| Cloudflare R2                  | mp3 音声キャッシュ                  | 無料枠（10 GB ストレージ）        |
| Cloudflare Access (Zero Trust) | 認証ゲート                          | 無料枠（50 ユーザーまで）         |
| Cloudflare DNS                 | `english-phrase.work` ドメイン管理 | DNS 無料                          |
| Notion API                     | データソース                        | 無料                              |
| OpenAI TTS API                 | `gpt-4o-mini-tts` 音声生成          | 従量課金（月額上限 $5〜$10）       |
| GitHub Actions                 | 自動 Sync / 自動 Deploy             | 無料枠（2,000 分/月）             |

### 開発ツール

| 技術          | バージョン | 用途                                       |
| ------------- | ---------- | ------------------------------------------ |
| Biome         | 2.4.11     | Lint + Formatter + Import 整列              |
| Vitest        | ^3.0 / ^4 | ユニットテスト（sync ^3、api ^3、web ^4）  |
| MSW           | ^2.13.3    | フロント開発時の API モック (`VITE_ENABLE_MSW=true`) |
| Storybook     | ^10.3.5    | UI コンポーネントのカタログ                |
| concurrently  | ^9.2.1     | ローカル開発時 3 サーバ並列起動            |

## アーキテクチャパターン

### モノレポ構成（pnpm workspaces）

```
english-phrase/                ← workspace root
├── packages/
│   ├── db/                    ← @english-phrase/db (Drizzle schema + migrations)
│   └── types/                 ← @english-phrase/types (API ↔ Web 共有型)
└── apps/
    ├── sync/                  ← Node CLI (Notion → D1)
    ├── api/                   ← Cloudflare Workers (Hono)
    └── web/                   ← Cloudflare Workers Static Assets (React SPA)
```

- `packages/*` は `apps/*` から `workspace:*` で参照する。
- `apps/*` 同士は直接依存しない（API ↔ Web の境界は `packages/types` を介する）。
- 共通設定: `tsconfig.base.json` / ルート `biome.json` / `pnpm-workspace.yaml`（catalog）。

### レイヤー責務（apps/api）

```
┌─────────────────────────────────────┐
│ Route Layer (routes/*.ts)           │ ← HTTP I/O・入力バリデーション
├─────────────────────────────────────┤
│ Service Layer (services/*.ts)       │ ← ビジネスロジック（OpenAI 呼び出し・R2 キャッシュ）
├─────────────────────────────────────┤
│ Data Layer (drizzle + D1 / R2)      │ ← Bindings 経由のストレージ
└─────────────────────────────────────┘
```

- ルートは入力バリデーションとレスポンス組み立てに集中する。
- 副作用を持つロジック（外部 API 呼び出し / R2 操作）は `services/` に切り出してテスト可能にする。
- D1 アクセスは Drizzle のクエリビルダーで型安全に行う。

### レイヤー責務（apps/web）

```
┌─────────────────────────────────────┐
│ Routes (routes/*.tsx)               │ ← 画面ごとのコンテナ。beforeLoad で認可ガード
├─────────────────────────────────────┤
│ Components (components/*.tsx)       │ ← 表示専用。状態は props で受ける
├─────────────────────────────────────┤
│ Hooks (hooks/*.ts)                  │ ← API 呼び出し / 再生制御
├─────────────────────────────────────┤
│ Lib (lib/session.ts, lib/utils.ts)  │ ← セッション状態、純粋関数ユーティリティ
└─────────────────────────────────────┘
```

- Route は薄く保ち、データ取得は hooks に閉じる。
- Component は受け取った props を表示する純粋表示層に近づける。
- セッション状態（`started` / `reviewedPhrases`）はモジュールスコープの変数で持ち、リロードで揮発させる（永続化しない）。

## デプロイメントアーキテクチャ

### ドメイン構成

```
english-phrase.work/*          → Cloudflare Workers Static Assets (apps/web)
english-phrase.work/api/*      → Cloudflare Workers (apps/api)
```

- 同一オリジン構成のため CORS は不要。
- Worker Route のパターンで Cloudflare 側が `/api/*` を API Worker に、それ以外を Web Worker に振り分ける。
- Cloudflare Access はドメイン全体に適用するため、Web を開いた時点でログインが完了し、その後の `fetch("/api/v1/...")` は認証済みセッションで届く。
- `apps/api` の `wrangler.toml` に `workers_dev = false` を設定し、`*.workers.dev` URL を完全閉鎖する（Access を迂回されないため）。

### CI/CD

| ワークフロー | トリガー                   | 内容                                                |
| ------------ | -------------------------- | --------------------------------------------------- |
| `sync.yml`   | `schedule` 19:00 UTC + 手動 | `pnpm sync:ci` を実行                              |
| `deploy.yml` | `push` to `main` + 手動    | `pnpm release` (API・Web の並列デプロイ)           |

DB マイグレーション (`pnpm db:migrate`) は自動化しない。スキーマ変更時のみローカルから手動実行する（既存テーブルがある状態で再実行するとエラーになるため）。

## データ永続化戦略

### ストレージ方式

| データ種別         | ストレージ            | フォーマット | 理由                                                       |
| ------------------ | --------------------- | ------------ | ---------------------------------------------------------- |
| 単語データ         | Cloudflare D1         | SQLite       | Workers ネイティブ、無料枠、Drizzle 対応                   |
| 同期境界時刻       | Cloudflare D1         | SQLite       | 単語と同じトランザクション境界で扱えるため                 |
| 音声 mp3           | Cloudflare R2         | バイナリ     | キー検索・大容量無料枠、Workers ネイティブ                 |
| クライアント状態  | JavaScript モジュール変数 | メモリ      | リロードで揮発させる仕様（永続化したくない）               |
| シークレット       | Worker Secret / GitHub Actions Secrets | -  | バインディング経由でランタイムに渡る。リポジトリには持たない |

### バックアップ戦略

- **D1**: Cloudflare 側で自動的に時点リストア可能。明示的なバックアップは取らない（Notion 側が SoT のため、最悪 sync 全件再実行で復元可能）。
- **R2**: バックアップしない（消えても OpenAI から再生成可能。コストも軽微）。
- **Notion**: Notion 公式のエクスポート機能に依存。本アプリは触らない。

### スキーマ管理

- `packages/db/src/schema.ts` を唯一の定義元とする。マイグレーション SQL は手書きしない。
- 変更フロー:
  1. `schema.ts` を編集
  2. `pnpm db:generate` で `packages/db/migrations/NNNN_*.sql` を自動生成
  3. `pnpm db:migrate`（本番）または `pnpm db:migrate:local`（ローカル）で適用
- 破壊的なスキーマ変更時は `DELETE FROM sync_logs;` を併用して全件再同期する。

## パフォーマンス要件

### レスポンスタイム（目標）

| 操作                                | 目標時間 | 備考                                       |
| ----------------------------------- | -------- | ------------------------------------------ |
| `POST /api/v1/phrase`               | < 200 ms | D1 1 クエリ（`ORDER BY RANDOM() LIMIT 1`） |
| `POST /api/v1/speech` (キャッシュHit) | < 300 ms | R2 GET のみ                              |
| `POST /api/v1/speech` (キャッシュMiss) | < 5 s | OpenAI TTS 呼び出し + R2 PUT             |
| 画面遷移（Start → Quiz）            | < 1 s    | 初回 API 取得を含む                        |

### スループット

- 個人利用のため日次数百リクエスト程度を想定。Workers / D1 / R2 の無料枠で十分まかなえる。

### リソース使用量

| リソース                | 上限                 | 理由                                            |
| ----------------------- | -------------------- | ----------------------------------------------- |
| Workers CPU time        | 50 ms / リクエスト   | Free プランの制限。OpenAI 呼び出し中は I/O 待ち |
| D1 行数                 | 1〜2 万行を想定      | 単語帳の規模上限                                |
| R2 オブジェクト数       | 1〜2 万 mp3 を想定   | 各単語 1 オブジェクト                           |
| `text` 入力長 (`/speech`) | 500 文字            | コスト暴発の予防（Voice 対象は `word` のみだが念のため） |

## セキュリティアーキテクチャ

### 認証・認可

- **境界防御**: Cloudflare Access を `english-phrase.work/*` に適用し、許可メールアドレスのみアクセス可能にする。Worker 内では追加の認証チェックは行わない。
- **workers.dev の閉鎖**: `apps/api/wrangler.toml` で `workers_dev = false`。これを開けたままだと Access を迂回されるため必須。
- **Web フロント**: Web 側もドメイン保護下にあるため、ログイン後の SPA セッションは Cloudflare 側のクッキーに依存する。

### シークレット管理

| シークレット                  | 保管場所                      | 用途                  |
| ----------------------------- | ----------------------------- | --------------------- |
| `OPENAI_API_KEY`              | Cloudflare Worker Secret      | Workers ランタイム    |
| `NOTION_API_KEY`              | GitHub Actions Secrets + 個人 `.env` | sync 実行時          |
| `NOTION_DATABASE_ID`          | GitHub Actions Secrets + 個人 `.env` | sync 実行時          |
| `CLOUDFLARE_API_TOKEN`        | GitHub Actions Secrets + 個人 `.env` | wrangler             |
| `CLOUDFLARE_ACCOUNT_ID`       | GitHub Actions Secrets + 個人 `.env` | wrangler             |
| `D1_DB_NAME`                  | GitHub Actions Secrets + 個人 `.env` | sync スクリプト      |

- ローカルの `.env` は `.gitignore` 済み。`.env.example` のみコミット。
- `apps/sync/output.sql` も `.gitignore` 済み（全単語データを含むため）。

### 入力検証

- `apps/api/src/routes/speech.ts` で `phraseId` (number) / `text` (空・500文字超チェック) を厳格にバリデーション。
- `apps/api/src/routes/phrase.ts` は入力を受け取らない（リクエストボディ無し）。
- D1 への INSERT 値は `apps/sync/src/escape.ts` の `esc()` で SQL エスケープ。Drizzle (apps/api) ではパラメータバインディングが効くので追加処理は不要。

### 多重実行・濫用対策

- フロント側で voice ボタン連打を防ぐ（`useVoice` の `voiceState !== "idle"` ガード）。
- `usePhrase` は `AbortController` で前回リクエストをキャンセルし、二重表示を防ぐ。
- OpenAI 月額上限を $5〜$10 に設定し、R2 キャッシュで再生成を回避する。

## テスト戦略

### ユニットテスト

- **フレームワーク**: Vitest（apps/sync・apps/api は ^3、apps/web は ^4）
- **対象**:
  - `apps/sync/src/escape.test.ts` — SQL エスケープの境界条件
  - `apps/api/src/services/speech.test.ts` — `textHash`・`buildCacheKey` の純粋関数
- **カバレッジ目標**: 数値目標は設けない。副作用を持たない純粋関数を中心にカバーする。

### 手動 / E2E

- ローカル: `pnpm dev` で DB Studio + Workers dev + Vite を並列起動。`http://localhost:5173` で動作確認。
- 本番: GitHub Actions による自動デプロイ後、`https://english-phrase.work` で Access ログイン → 学習フロー → 音声再生（1 回目は OpenAI、2 回目以降は R2 キャッシュ）を確認。

### コードチェック

- `pnpm lint` / `pnpm format` / `pnpm check` (Biome)。
- TypeScript の型チェックは `apps/web` の `pnpm build`（`tsc -b`）でも走る。

## 技術的制約

### 環境要件

- **OS**: 開発は macOS を想定。CI は `ubuntu-latest`。
- **Node**: >= 24.0.0。`.node-version` でローカルピン留め。
- **必要な外部依存**: Cloudflare アカウント、Notion API キー、OpenAI API キー、独自ドメイン（`english-phrase.work`）。

### パフォーマンス制約

- Workers Free プランの CPU time 50ms 上限を守る（OpenAI 呼び出しは I/O のためカウントされない想定だが、レスポンス組み立て側で重い処理を入れない）。
- `output.sql` のサイズが膨大化すると `wrangler d1 execute --file` が詰まる可能性がある（1 万件想定なら問題ないが、超える場合は分割実行する）。
- `apps/sync` は実行時に `wrangler` CLI を `execFileSync` で呼び出すため、`node_modules/.bin/wrangler` がワークスペース ルートに解決される必要がある（モノレポ構造に依存）。

### セキュリティ制約

- OpenAI API キーをフロントには絶対に渡さない（必ず Workers Secret 経由）。
- Cloudflare Access のメール許可リストを公開しない。
- `output.sql` を絶対にコミットしない（`.gitignore` で防御済み）。

## 依存関係管理

| カテゴリ                       | 方針                                                       |
| ------------------------------ | ---------------------------------------------------------- |
| ワークスペース共通の重要依存  | `pnpm-workspace.yaml` の `catalog:` で集約 (`typescript`, `@types/node`, `drizzle-orm`, `wrangler`) |
| 各アプリ固有の依存             | 各 `package.json` で範囲指定（`^x.y.z`）                  |
| ロックファイル                 | `pnpm-lock.yaml` をリポジトリにコミットし、CI は `--frozen-lockfile` で固定 |
| Node バージョン                | `.node-version` (24.x) と `package.json#engines` の両方で固定 |
| パッケージマネージャ           | `package.json#packageManager: pnpm@11.1.0` で固定         |
| 許可ビルド                     | `pnpm-workspace.yaml` の `allowBuilds` で `esbuild` / `msw` / `sharp` / `workerd` を許可（pnpm v11 の `ignored-build-scripts` 対策） |
