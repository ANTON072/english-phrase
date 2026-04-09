# Phase 1 実装プラン: Notion → Cloudflare D1 Sync

## 概要

Notionで管理している英単語帳（DB\_単語帳）をCloudflare D1に同期するCLIスクリプトを作る。
初回は全件（〜1万件）を登録。2回目以降は新規追加・編集されたデータを反映（upsert）。削除は無視。

---

## Notion DBスキーマ（確認済み）

| Notionプロパティ | 型           | D1カラム                              |
| ---------------- | ------------ | ------------------------------------- |
| `単語`           | title        | `word` TEXT NOT NULL                  |
| `意味`           | text         | `meaning` TEXT                        |
| `品詞`           | multi_select | `part_of_speech` TEXT（JSON文字列）   |
| `例文`           | text         | `example` TEXT                        |
| `例文訳`         | text         | `example_translation` TEXT            |
| `作成日時`       | created_time | `notion_created_at` TEXT              |
| page ID          | —            | `notion_page_id` TEXT UNIQUE NOT NULL |

- Database ID: `4bc56ce1-9964-8279-8dd8-87f0565d9109`
- スキップ: `チェック`, `リセット`, `赤シート`, `数式`

---

## ディレクトリ構造

```
english-phrase/
├── package.json              # pnpm workspaceルート
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── packages/
│   └── db/
│       ├── package.json
│       ├── tsconfig.json
│       ├── drizzle.config.ts
│       ├── src/
│       │   └── schema.ts         # スキーマの唯一の定義元
│       └── migrations/
│           └── 0001_create_phrases.sql  # drizzle-kit generate で自動生成
└── apps/
    ├── sync/                 # Phase 1
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── .env.example
    │   └── src/
    │       └── index.ts
    ├── api/
    │   └── package.json      # Phase 2スタブ
    └── web/
        └── package.json      # Phase 3スタブ
```

---

## スキーマ管理（Drizzle）

スキーマは `packages/db/src/schema.ts` を**唯一の定義元**とする。マイグレーションSQLは手書きせず `drizzle-kit generate` で自動生成。

```typescript
// packages/db/src/schema.ts
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const phrases = sqliteTable("phrases", {
  id: int("id").primaryKey({ autoIncrement: true }),
  notionPageId: text("notion_page_id").notNull().unique(),
  word: text("word").notNull(),
  meaning: text("meaning"),
  partOfSpeech: text("part_of_speech"),
  example: text("example"),
  exampleTranslation: text("example_translation"),
  notionCreatedAt: text("notion_created_at"),
  syncedAt: text("synced_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// 差分同期のためにsync実行時刻を記録するテーブル
export const syncLogs = sqliteTable("sync_logs", {
  id: int("id").primaryKey({ autoIncrement: true }),
  syncedAt: text("synced_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type NewPhrase = typeof phrases.$inferInsert;
```

カラムを追加・変更する場合は `schema.ts` だけ修正し、以下を実行：

```bash
# マイグレーションSQL を自動生成
npx drizzle-kit generate

# D1 に適用
npx wrangler d1 migrations apply english-phrase-db --remote
```

---

## 同期スクリプトの設計

`apps/sync/src/index.ts`

### 処理フロー

1. 環境変数をバリデーション
2. D1の `sync_logs` から前回の境界時刻を取得（初回はNULL）
3. `@notionhq/client` で `databases.query` を呼び出し、100件ずつページネーションで取得
   - 初回（前回境界がNULL）: 全件取得
   - 2回目以降: `last_edited_time > 前回境界` でフィルタして差分のみ取得
   - 取得しながら全ページの `last_edited_time` の最大値を記録する
4. 各ページを `NewPhrase` 型のオブジェクトに変換
5. SQLファイル（`output.sql`）を生成（upsert文を差分分だけ書き出し）
6. `wrangler d1 execute` でD1に適用（ここまで成功した場合のみ次のステップへ）
7. 処理ページの `last_edited_time` 最大値を `sync_logs` に記録（次回の境界になる）
   - 処理ページが0件の場合は記録しない（境界を進めない）
8. 進捗をコンソールに出力

### SQLファイル生成とwrangler実行

```typescript
import type { NewPhrase } from "@english-phrase/db";

// 前回の境界時刻を取得
const lastSyncResult = execSync(
  `wrangler d1 execute ${D1_DB_NAME} --remote --command="SELECT MAX(synced_at) as last FROM sync_logs;" --json`,
).toString();
const lastBoundary: string | null =
  JSON.parse(lastSyncResult)[0].results[0].last;

// Notion クエリ: 初回は全件、2回目以降は前回境界以降の差分のみ
const filter = lastBoundary
  ? {
      timestamp: "last_edited_time",
      last_edited_time: { after: lastBoundary },
    }
  : undefined;

// 取得しながら last_edited_time の最大値を追跡する
let maxLastEditedTime: string | null = null;

// schema.ts の NewPhrase 型に合わせてオブジェクトを構築する。
// NOT NULL かつ DEFAULT なしのカラム追加 → 必須プロパティになりコンパイルエラーで検知できる。
// nullable または DEFAULT 付きのカラム追加 → オプショナルになるためコンパイルエラーにならない点に注意。
const word = extractText(p["単語"]);
if (!word) {
  console.warn(`Skipping page ${page.id}: empty word`);
  continue; // このページはスキップ
}

const row: NewPhrase = {
  notionPageId: page.id,
  word,
  meaning: extractText(p["意味"]),
  partOfSpeech: extractMultiSelect(p["品詞"]),
  example: extractText(p["例文"]),
  exampleTranslation: extractText(p["例文訳"]),
  notionCreatedAt: extractCreatedTime(p["作成日時"]),
};

// SQLの値を文字列エスケープ（シングルクォートを '' に）
function esc(value: string | null | undefined): string {
  if (value == null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

// upsert 文を生成してファイルに書き出す
// notion_page_id が存在しない → INSERT、存在する → 各フィールドを UPDATE
const lines = rows.map(
  (r) =>
    `INSERT INTO phrases ` +
    `(notion_page_id, word, meaning, part_of_speech, example, example_translation, notion_created_at) ` +
    `VALUES (${esc(r.notionPageId)}, ${esc(r.word)}, ${esc(r.meaning)}, ${esc(r.partOfSpeech)}, ${esc(r.example)}, ${esc(r.exampleTranslation)}, ${esc(r.notionCreatedAt)}) ` +
    `ON CONFLICT(notion_page_id) DO UPDATE SET ` +
    `word=excluded.word, meaning=excluded.meaning, part_of_speech=excluded.part_of_speech, ` +
    `example=excluded.example, example_translation=excluded.example_translation, synced_at=datetime('now');`,
);
fs.writeFileSync("output.sql", lines.join("\n"));

// wrangler CLI で D1 に適用
execSync(`wrangler d1 execute ${D1_DB_NAME} --remote --file=output.sql`, {
  stdio: "inherit",
});

// D1反映まで成功した場合のみ境界を更新する
// → 失敗時は sync_logs を更新しないため、次回は同じ境界から再試行できる
if (maxLastEditedTime) {
  execSync(
    `wrangler d1 execute ${D1_DB_NAME} --remote --command="INSERT INTO sync_logs (synced_at) VALUES ('${maxLastEditedTime}');"`,
  );
}
// 処理ページが0件の場合は境界を進めない
```

- `last_edited_time` フィルタにより差分のみ取得されるため、2回目以降は新規・編集された分だけD1に書き込まれる
- `ON CONFLICT DO UPDATE` により新規はINSERT、既存はUPDATE
- `NewPhrase` 型を使うことで、NOT NULL かつ DEFAULT なしのカラム追加時はコンパイルエラーで検知できる。ただし nullable・DEFAULT 付きカラムはオプショナルになるため検知されない点に注意

### 環境変数

`apps/sync/.env.example`

```bash
NOTION_API_KEY=secret_xxxx
NOTION_DATABASE_ID=xxxx
CLOUDFLARE_API_TOKEN=xxxx   # wrangler が参照するトークン
D1_DB_NAME=english-phrase-db
```

---

## 依存パッケージ

| パッケージ                  | 場所                | 用途                        |
| --------------------------- | ------------------- | --------------------------- |
| `wrangler`                  | ルート (dev)        | D1 CLIおよびWorkerデプロイ  |
| `drizzle-orm`               | `packages/db`       | スキーマ型定義              |
| `drizzle-kit`               | `packages/db` (dev) | マイグレーションSQL自動生成 |
| `@english-phrase/db`        | `apps/sync`         | NewPhrase型のimport         |
| `@notionhq/client`          | `apps/sync`         | Notion API                  |
| `dotenv`                    | `apps/sync`         | .envの読み込み              |
| `tsx`                       | `apps/sync` (dev)   | TypeScript直接実行          |
| `typescript`, `@types/node` | `apps/sync` (dev)   | 型                          |

---

## セットアップ & 実行手順

### 初回セットアップ（Macターミナルで1回だけ実施）

```bash
# 1. 依存インストール
pnpm install

# 2. Cloudflareにログイン
npx wrangler login

# 3. D1データベース作成
npx wrangler d1 create english-phrase-db

# 4. マイグレーション適用
npx wrangler d1 migrations apply english-phrase-db --remote
```

### セットアップのやり直し（トライアンドエラー時）

wranglerはD1内の `d1_migrations` テーブルで適用済みマイグレーションを管理している。テーブルを DROP するだけでは `d1_migrations` に「適用済み」の記録が残るため、`migrations apply` を再実行しても何も起きない。以下のいずれかの方法を使うこと。

**方法A: テーブルと移行履歴をまとめてリセット（データのみやり直し）**

```bash
# アプリテーブルとwranglerのマイグレーション管理テーブルを削除
npx wrangler d1 execute english-phrase-db --remote \
  --command="DROP TABLE IF EXISTS phrases; DROP TABLE IF EXISTS sync_logs; DROP TABLE IF EXISTS d1_migrations;"

# マイグレーションを最初から再適用
npx wrangler d1 migrations apply english-phrase-db --remote
```

**方法B: Cloudflare D1を丸ごと削除して完全にやり直す**

```bash
# Cloudflare D1のデータベースを削除（Notionのデータは一切影響なし）
npx wrangler d1 delete english-phrase-db

# 同じ名前で再作成してマイグレーション適用
npx wrangler d1 create english-phrase-db
npx wrangler d1 migrations apply english-phrase-db --remote
```

> `.env` は名前ベース（`D1_DB_NAME=english-phrase-db`）で管理しているため、同じ名前で作り直せば更新不要。

### sync実行

```bash
cp apps/sync/.env.example apps/sync/.env
# .envを編集（NOTION_API_KEY, CLOUDFLARE_API_TOKEN など）

pnpm --filter sync run sync
```

---

## 検証方法

```bash
# テーブル件数確認
npx wrangler d1 execute english-phrase-db \
  --remote --command="SELECT count(*) as total FROM phrases;"

# Notionに変更がない状態で再実行 → 処理件数0、DB件数変わらずを確認
pnpm --filter sync run sync
```

---

## 注意点・設計上の決定事項

- **Drizzleはスキーマ管理とマイグレーションに使用**。D1への書き込みはSQLファイル生成 + wrangler CLI（Node.jsからD1へのDrizzleドライバは不要）
- **`NewPhrase` 型をsyncスクリプトで利用**: NOT NULL かつ DEFAULT なしのカラム追加時はコンパイルエラーで検知できる。nullable・DEFAULT 付きカラムはオプショナルになるため検知されない点に注意
- **カラム追加後のデータ補完**: 新カラム追加→マイグレーション→sync実行で既存レコードも新カラムが埋まる
- **SQLエスケープ**: シングルクォートを `''` に変換して安全に文字列値を埋め込む
- **アーカイブ済みNotionページはスキップ**（`page.archived === true` の場合除外）
- **`word`が空の場合はスキップしてログ警告**
- **将来GitHub Actionsに移行する場合**: `CLOUDFLARE_API_TOKEN` など同じ環境変数をシークレットに設定すればそのまま動作する
- **`output.sql` は `.gitignore` に追加必須**: 全単語データが含まれるため誤コミットを防ぐ
- **`wrangler d1 execute --file` のサイズ制限**: 1万件のINSERT文は数MBになる。wranglerは内部でバッチ処理するが問題が生じた場合はスクリプト側でファイルを分割して複数回実行する対応が必要

---

## DBリセット

カラム追加程度のマイグレーションはupsertで対応できる。カラムのリネーム・型変更・テーブル構造の大幅変更など、データ変換が必要な場合はリセット＋再syncが安全。

### リセット手順

破壊的なスキーマ変更時は `sync_logs` も必ずクリアすること。`sync_logs` に境界時刻が残ったまま再syncすると、空になった `phrases` に対して差分取得しか行われず全件再構築できない。

```bash
# 1. テーブルを削除して再作成するマイグレーションを適用
npx wrangler d1 migrations apply english-phrase-db --remote

# 2. sync_logs をクリア（全件取得を強制するため）
npx wrangler d1 execute english-phrase-db --remote \
  --command="DELETE FROM sync_logs;"

# 3. Notionから全件再sync
pnpm --filter sync run sync
```

マイグレーションファイルの例（`packages/db/migrations/0002_reset_phrases.sql`）:

```sql
DROP TABLE IF EXISTS phrases;
CREATE TABLE phrases (
  -- 新しいスキーマ
);
-- sync_logs もクリアして次回syncで全件取得を強制する
DELETE FROM sync_logs;
```

---

## 今後のフェーズ（参考）

- **Phase 2**: `apps/api` — Cloudflare Workers + Hono でランダム1件返却API
- **Phase 3**: `apps/web` — Vite React SPA またはHonoフロント（要検討）
