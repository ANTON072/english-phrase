# CLAUDE.md

## プロジェクト概要

英語フレーズ学習アプリの pnpm モノレポ。Notion をデータソースとし Cloudflare D1 に同期する。

- `packages/db` — 共有 Drizzle スキーマ (`@english-phrase/db`)。`phrases` と `sync_logs` テーブルを定義
- `apps/sync` — Notion → D1 差分同期 CLI (Phase 1、完了)
- `apps/api` — Cloudflare Workers API (Phase 2、stub)
- `apps/web` — Web フロントエンド (Phase 3、stub)

## コマンド

```bash
pnpm sync         # Notion → D1 同期実行
pnpm test         # Vitest でテスト実行
pnpm db:generate  # スキーマ変更からマイグレーション SQL 生成
pnpm db:studio    # Drizzle Studio 起動
pnpm db:migrate   # wrangler でマイグレーション適用
```

## アーキテクチャのポイント

**差分同期の仕組み**:
- `sync_logs` テーブルの `synced_at` を境界として保持
- 初回は全件、2回目以降は `last_edited_time > boundary` のみ取得
- D1 書き込み成功後のみ boundary を更新 (リトライ安全)

**SQL 生成と実行**:
- UPSERT SQL を一時ファイル (`output.sql`) に生成
- `wrangler d1 execute --file` で D1 に適用
- `output.sql` は `.gitignore` 済み (平文 SQL に値が含まれるため)

**SQL エスケープ**:
- `apps/sync/src/escape.ts` の `esc()` 関数を使用
- `null/undefined` → `NULL`、シングルクォートは二重化してラップ

**スキーマ管理**:
- `packages/db/src/schema.ts` が唯一の定義元
- 変更後は `pnpm db:generate` でマイグレーション SQL を生成してから apply

## 環境変数

`apps/sync/.env` が必要 (`.env.example` を参照):

```
NOTION_API_KEY, NOTION_DATABASE_ID
CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
CF_D1_DATABASE_ID, D1_DB_NAME
```

Drizzle (`drizzle.config.ts`) は `CLOUDFLARE_ACCOUNT_ID`、`CF_D1_DATABASE_ID`、`CLOUDFLARE_API_TOKEN` を使用。
