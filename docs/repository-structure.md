# リポジトリ構造定義書 (Repository Structure Document)

## プロジェクト構造（モノレポ）

```
english-phrase/
├── .claude/                       # Claude Code 設定（コマンド・スキル・エージェント）
├── .github/
│   └── workflows/                 # GitHub Actions
│       ├── sync.yml               # 毎朝 04:00 JST に sync 実行
│       └── deploy.yml             # main push で API・Web 自動デプロイ
├── .steering/                     # 作業単位の一時ドキュメント（履歴）
├── .vscode/                       # 共有 VSCode 設定
├── apps/
│   ├── sync/                      # Node CLI: Notion → D1 差分同期
│   ├── api/                       # Cloudflare Workers + Hono
│   └── web/                       # React SPA (Vite + Workers Static Assets)
├── packages/
│   ├── db/                        # Drizzle スキーマ + マイグレーション
│   └── types/                     # API ↔ Web 共有型
├── docs/                          # 永続ドキュメント
│   ├── product-requirements.md
│   ├── functional-design.md
│   ├── architecture.md
│   ├── repository-structure.md
│   ├── development-guidelines.md
│   ├── glossary.md
│   └── ideas/                     # 壁打ち・ブレインストーミング下書き
├── .env.example                   # 環境変数テンプレート
├── .gitignore
├── .node-version                  # Node v24 系
├── .npmrc
├── .mcp.json                      # MCP サーバ設定
├── biome.json                     # Biome lint/format 設定
├── CLAUDE.md                      # プロジェクト固有の Claude 指示
├── package.json                   # ワークスペースルート
├── pnpm-lock.yaml
├── pnpm-workspace.yaml            # workspaces + catalog 設定
├── README.md
└── tsconfig.base.json             # 共通 TS 設定
```

## ディレクトリ詳細

### apps/sync — Notion → D1 同期 CLI

**役割**: Notion DB から差分ページを取得し、`output.sql` を生成して `wrangler d1 execute --file` で D1 に UPSERT する。

```
apps/sync/
├── src/
│   ├── index.ts          # メイン処理（境界取得 → Notion 取得 → SQL 生成 → D1 適用 → 境界更新）
│   ├── escape.ts         # SQL シングルクォートエスケープ esc()
│   └── escape.test.ts    # esc() のユニットテスト
├── output.sql            # 実行時のみ生成（.gitignore 済み）
├── package.json
└── tsconfig.json
```

**配置ファイル**:

- 同期ロジック本体・Notion プロパティ抽出関数: `src/index.ts`
- 副作用を持たないユーティリティ: `src/escape.ts`
- ユニットテスト: `src/*.test.ts`（同階層に並置）

**依存関係**:

- 依存可能: `@english-phrase/db`（`NewPhrase` 型のみ）、`@notionhq/client`、Node 標準ライブラリ
- 依存禁止: `apps/api`、`apps/web`、ブラウザ専用 API

**実行スクリプト**:

| スクリプト           | コマンド                                  | 用途                          |
| -------------------- | ----------------------------------------- | ----------------------------- |
| `pnpm sync`          | `tsx --env-file=../../.env src/index.ts`  | ローカル実行（リモート D1）  |
| `pnpm sync:local`    | `LOCAL=true pnpm sync`                    | ローカル D1（wrangler dev）  |
| `pnpm sync:ci`       | `tsx src/index.ts`                        | GitHub Actions（.env 不使用）|

### apps/api — Cloudflare Workers API

**役割**: D1 からのランダムフレーズ取得と、OpenAI TTS + R2 キャッシュによる音声配信。

```
apps/api/
├── src/
│   ├── index.ts                  # Hono アプリ初期化、Bindings 型、ルート登録
│   ├── routes/
│   │   ├── phrase.ts             # POST /api/v1/phrase
│   │   └── speech.ts             # POST /api/v1/speech（入力バリデーション）
│   └── services/
│       ├── speech.ts             # OpenAI TTS 呼び出し + R2 キャッシュ
│       └── speech.test.ts        # textHash / buildCacheKey ユニットテスト
├── package.json
├── tsconfig.json
└── wrangler.toml                 # Workers 設定、D1 / R2 binding、Worker Route
```

**レイヤー責務**:

- `routes/` — HTTP I/O・入力バリデーション。副作用ロジックは持たない。
- `services/` — 外部 API 呼び出し・キャッシュ操作などの副作用。テスト可能な単位に分離。
- D1 アクセスは Drizzle を route 層で呼び出す（薄い処理のためサービス層に分離していない）。

**依存関係**:

- 依存可能: `@english-phrase/db`（スキーマ）、`@english-phrase/types`（共有型）、`hono`、`drizzle-orm/d1`
- 依存禁止: `apps/sync`、`apps/web`、Node 専用 API（`fs` など Workers で使えないもの）

**実行スクリプト**:

| スクリプト        | コマンド                          | 用途                       |
| ----------------- | --------------------------------- | -------------------------- |
| `pnpm api:dev`    | `wrangler dev --port 8787`        | ローカル開発（ローカル D1）|
| `pnpm api:deploy` | `wrangler deploy --env production` | 本番デプロイ              |

### apps/web — React SPA

**役割**: スタート → クイズ → 結果 の 3 画面遷移を担う SPA。

```
apps/web/
├── .storybook/                   # Storybook 設定（main.ts, preview.ts）
├── public/                       # 静的アセット（mockServiceWorker.js など）
├── src/
│   ├── main.tsx                  # ルーター起動、QueryClient、MSW (DEV) 初期化
│   ├── constants.ts              # API_ENDPOINT / SPEECH_ENDPOINT
│   ├── vite-env.d.ts
│   ├── routeTree.gen.ts          # @tanstack/router-plugin 生成（編集禁止）
│   ├── routes/
│   │   ├── __root.tsx            # レイアウト + Toaster
│   │   ├── index.tsx             # /
│   │   ├── quiz.tsx              # /quiz
│   │   └── result.tsx            # /result
│   ├── components/
│   │   ├── QuizCard.tsx          # 質問/解答カード
│   │   ├── ErrorMessage.tsx
│   │   ├── ErrorMessage.stories.tsx
│   │   └── ui/                   # shadcn 生成: button / badge / card / spinner
│   ├── hooks/
│   │   ├── usePhrase.ts
│   │   └── useVoice.ts
│   ├── lib/
│   │   ├── session.ts            # startSession / addReviewed / getReviewed
│   │   └── utils.ts              # cn / parsePartOfSpeech
│   ├── mocks/                    # MSW: handlers.ts, browser.ts
│   ├── styles/                   # globals.css (Tailwind 4)
│   └── types/
│       └── index.ts              # PageState
├── components.json               # shadcn CLI 設定
├── package.json
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── vite.config.ts
├── vitest.shims.d.ts
└── wrangler.toml                 # Workers Static Assets 設定
```

**レイヤー責務**:

- `routes/*.tsx` — 画面コンテナ。`beforeLoad` で認可ガード（`isStarted()`）。データ取得は hooks に委譲。
- `components/*.tsx` — 表示専用コンポーネント。状態は props 受け取り。`ui/` は shadcn 生成物。
- `hooks/*.ts` — API 呼び出し、音声再生制御、副作用管理（AbortController / useEffect クリーンアップ）。
- `lib/session.ts` — モジュールスコープでのセッション状態保持（リロードで揮発）。
- `lib/utils.ts` — 純粋関数のみ（`cn`, `parsePartOfSpeech`）。

**依存関係**:

- 依存可能: `@english-phrase/types`、`@tanstack/react-*`、`react`、`radix-ui`、`lucide-react`、`sonner`
- 依存禁止: `@english-phrase/db`（D1 スキーマはサーバ側専用）、`apps/api`・`apps/sync`、Node 専用 API

**生成物・編集禁止ファイル**:

- `src/routeTree.gen.ts` — `vite` 開発時に自動生成される。手動編集しない。
- `public/mockServiceWorker.js` — `msw init` で生成される。手動編集しない。

**実行スクリプト**:

| スクリプト          | コマンド                                       | 用途                  |
| ------------------- | ---------------------------------------------- | --------------------- |
| `pnpm web:dev`      | `vite`                                         | ローカル開発（5173） |
| `pnpm web:build`    | `tsc -b && vite build`                         | 型チェック + ビルド   |
| `pnpm web:deploy`   | `pnpm run build && wrangler deploy --env production` | 本番デプロイ        |
| `pnpm storybook`    | `storybook dev -p 6006`                        | UI カタログ           |

### packages/db — 共有 DB スキーマ

**役割**: Drizzle スキーマと自動生成マイグレーション SQL の単一の保管場所。

```
packages/db/
├── src/
│   └── schema.ts                # phrases / sync_logs テーブル定義
├── migrations/
│   ├── 0000_fluffy_impossible_man.sql   # drizzle-kit 自動生成
│   └── meta/                            # drizzle-kit メタ情報
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

**配置ファイル**:

- スキーマの唯一の定義元: `src/schema.ts`
- マイグレーション SQL: `migrations/NNNN_*.sql`（手書き禁止、`drizzle-kit generate` で自動生成）
- メタファイル: `migrations/meta/_journal.json`、`migrations/meta/NNNN_snapshot.json`

**依存関係**:

- 依存可能: `drizzle-orm`、`drizzle-kit`
- 依存先（誰から使われるか）: `apps/sync`（型のみ）、`apps/api`（スキーマ + Drizzle クエリ）

**スクリプト**:

| スクリプト          | コマンド               | 用途                                    |
| ------------------- | ---------------------- | --------------------------------------- |
| `pnpm db:generate`  | `drizzle-kit generate` | `schema.ts` 変更からマイグレーション生成 |
| `pnpm db:studio`    | `drizzle-kit studio`   | Drizzle Studio 起動                     |

### packages/types — API ↔ Web 共有型

**役割**: API のリクエスト・レスポンス型を一元管理し、Worker と Web の二重定義を防ぐ。

```
packages/types/
├── src/
│   ├── index.ts          # 再エクスポート
│   ├── phrase.ts         # PhraseResponse
│   ├── speech.ts         # SpeechRequest
│   └── error.ts          # ErrorResponse
├── package.json
└── tsconfig.json
```

**配置ファイル**:

- 1 つの型を 1 ファイルに置き、`index.ts` で再エクスポートする。
- 値は持たない（型のみ）。実行時依存ゼロ。

**依存関係**:

- 依存可能: なし
- 依存先（誰から使われるか）: `apps/api`、`apps/web`

### docs/ — 永続ドキュメント

```
docs/
├── product-requirements.md   # PRD
├── functional-design.md       # 機能設計書
├── architecture.md            # 技術仕様書
├── repository-structure.md    # 本ドキュメント
├── development-guidelines.md  # 開発ガイドライン
├── glossary.md                # 用語集
└── ideas/                     # 壁打ち・ブレストの下書き（自由形式、setup-project の入力）
```

更新は普通の会話で依頼する（例: 「PRD に新機能を追加して」）。`/review-docs` で詳細レビューも可能。

### .claude/ — Claude Code 設定

```
.claude/
├── agents/                # サブエージェント定義
│   └── implementation-validator.md
├── commands/              # カスタムスラッシュコマンド
│   ├── add-feature.md
│   └── setup-project.md
└── skills/                # スキル定義（各モード）
    ├── prd-writing/
    ├── functional-design/
    ├── architecture-design/
    ├── repository-structure/
    ├── development-guidelines/
    ├── glossary-creation/
    └── steering/
```

`/setup-project` で 6 つの永続ドキュメントを作成し、`/add-feature [機能名]` で新規機能を実装する。

### .steering/ — 作業単位の一時ドキュメント

**役割**: 個別の開発作業ごとに「今回何をするか」を残す。後から履歴として参照できる。

```
.steering/
└── [YYYYMMDD]-[task-name]/
    ├── requirements.md       # 今回の作業要求
    ├── design.md             # 実装アプローチ
    └── tasklist.md           # タスクリスト
```

**命名規則**: `20260512-add-voice-feature` の形式（`YYYYMMDD-kebab-case`）。

**運用**: 作業計画・実装・検証時は `steering` スキルを使う（モード 1〜3）。詳細はスキル内に定義。

### .github/workflows/ — CI/CD

```
.github/workflows/
├── sync.yml      # 毎朝 04:00 JST (UTC 19:00) に sync 実行
└── deploy.yml    # main への push で API・Web を本番デプロイ
```

## ファイル配置規則

### ソースファイル

| ファイル種別                       | 配置先                                  | 命名規則           |
| ---------------------------------- | --------------------------------------- | ------------------ |
| Workers API ルート                 | `apps/api/src/routes/`                  | `[resource].ts`    |
| Workers API サービス（副作用ロジック） | `apps/api/src/services/`             | `[domain].ts`      |
| Sync ロジック                      | `apps/sync/src/`                        | 関数別ファイル     |
| React 画面コンテナ                 | `apps/web/src/routes/`                  | TanStack Router ファイルベース (`index.tsx`, `quiz.tsx`, ...) |
| React 表示コンポーネント           | `apps/web/src/components/`              | PascalCase.tsx     |
| React UI プリミティブ（shadcn）   | `apps/web/src/components/ui/`           | kebab-case.tsx     |
| React フック                       | `apps/web/src/hooks/`                   | `use*.ts`          |
| 純粋ユーティリティ                 | `apps/web/src/lib/` / `apps/sync/src/`  | camelCase.ts       |
| 型定義（クライアント専用）         | `apps/web/src/types/`                   | `index.ts` などに集約 |
| 型定義（API ↔ Web 共有）          | `packages/types/src/`                   | `[domain].ts`      |
| DB スキーマ                        | `packages/db/src/schema.ts`             | 単一ファイル       |
| 定数                               | `apps/web/src/constants.ts` など       | `UPPER_SNAKE_CASE` のエクスポート名 |

### テストファイル

ユニットテストはテスト対象と**同じディレクトリ**に並置する（`__tests__/` ディレクトリは使わない）。

| 対象               | テストファイル                           |
| ------------------ | ---------------------------------------- |
| `src/escape.ts`    | `src/escape.test.ts`                     |
| `src/services/speech.ts` | `src/services/speech.test.ts`      |

- 拡張子: `.test.ts` / `.test.tsx`
- 実行: `pnpm test`（sync と api の Vitest が走る）

### 設定ファイル

| 種別               | 配置先                          | 備考                                                  |
| ------------------ | ------------------------------- | ----------------------------------------------------- |
| Lint/Format        | ルート `biome.json`             | 全パッケージ共通                                      |
| TypeScript         | ルート `tsconfig.base.json` + 各パッケージ `tsconfig.json` | `extends` で継承        |
| Workspace          | ルート `pnpm-workspace.yaml`    | `packages/*`, `apps/*` + catalog                      |
| Wrangler           | `apps/api/wrangler.toml` / `apps/web/wrangler.toml` | アプリごとに分離            |
| Vite               | `apps/web/vite.config.ts`       |                                                       |
| Drizzle            | `packages/db/drizzle.config.ts` |                                                       |
| MCP                | ルート `.mcp.json`              | ローカル開発時のみ                                    |

## 命名規則

### ディレクトリ名

- すべて kebab-case（例: `english-phrase`, `add-feature`, `setup-project`）。
- `apps/*` / `packages/*` の中は単一の用途を表す単数形（`api`, `web`, `sync`, `db`, `types`）。

### ファイル名

ファイル名は**全て kebab-case を基本**とする（CLAUDE.md グローバル指示）。ただし以下の例外がある:

| 例外パターン                         | 例                              | 理由                                         |
| ------------------------------------ | ------------------------------- | -------------------------------------------- |
| React コンポーネント                 | `QuizCard.tsx`, `ErrorMessage.tsx` | プロジェクトの既存コンベンション（PascalCase）|
| React フック                         | `usePhrase.ts`, `useVoice.ts`   | フック関数名と一致させる camelCase           |
| TanStack Router 規約                 | `__root.tsx`                    | ルーターの命名規約                           |
| Storybook                            | `ErrorMessage.stories.tsx`      | 対応するコンポーネントと同名                 |
| shadcn 生成                          | `ui/button.tsx`                 | shadcn CLI の出力                            |
| マイグレーション                     | `0000_fluffy_impossible_man.sql` | `drizzle-kit generate` の自動生成              |

### エクスポートされる識別子

- 型: PascalCase（`PhraseResponse`, `NewPhrase`）
- 関数・変数: camelCase（`fetchPhrase`, `startSession`）
- 定数: UPPER_SNAKE_CASE（`API_ENDPOINT`, `MAX_TEXT_LENGTH`, `MODEL`, `VOICE`）

## 依存関係のルール

### パッケージ間の依存

```
apps/web   →  packages/types
apps/api   →  packages/types,  packages/db
apps/sync  →  packages/db      (型のみ)
packages/db →  (なし)
packages/types → (なし)
```

**禁止される依存**:

- `apps/*` 同士の相互参照（必要があれば `packages/types` などの共有パッケージへ抽出）
- `apps/web` から `packages/db` への参照（D1 スキーマはサーバ側専用）
- `packages/*` から `apps/*` への参照

### モジュール間の依存（apps/api 内）

```
routes/    →  services/   (OK)
routes/    →  drizzle-orm (OK)
services/  →  (外部API / R2)
```

**禁止**:

- `services/` から `routes/` への import（循環）
- routes 同士の直接 import（共通処理が必要なら `services/` か `lib/` を作って分離）

### モジュール間の依存（apps/web 内）

```
routes/    →  hooks/, components/, lib/   (OK)
components/ →  hooks/, lib/               (OK)
hooks/     →  lib/, constants.ts          (OK)
lib/       →  (なし)
```

**禁止**:

- `components/` から `routes/` への import
- `lib/` から `hooks/`・`components/`・`routes/` への import
- `components/ui/` から他コンポーネントへの import（shadcn 生成物はリーフ）

## 除外設定

### .gitignore（抜粋・特記事項）

| パターン               | 理由                                          |
| ---------------------- | --------------------------------------------- |
| `node_modules/`        | 依存ライブラリ                                |
| `dist/`, `.tanstack/`, `.wrangler/`, `.cache/` | 各種ビルド・ローカルランタイム生成物 |
| `.env`, `.env.*`, `.dev.vars`, `.dev.vars.*` | シークレットを含む環境変数      |
| `apps/sync/output.sql` | 全単語データを含む同期一時ファイル            |
| `.DS_Store`            | macOS 固有                                    |
| `storybook-static`     | Storybook 静的ビルド                          |

`.steering/` は **コミット対象**（履歴として残す）。

### Biome 除外（`biome.json` の `files.includes`）

- `**/*.gen.ts`（TanStack Router 自動生成）
- `**/dist`
- `**/.wrangler`
- `**/.tanstack`
- `**/mockServiceWorker.js`（MSW 生成）
