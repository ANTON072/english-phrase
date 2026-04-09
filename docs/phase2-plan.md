# Phase 2: Cloudflare Workers API (Hono + Cloudflare Access)

## 概要

Phase 1 で D1 に同期済みの `phrases` テーブルをサーブする Workers API を構築する。
認証は **Cloudflare Access (Zero Trust)** を使用。特定メールアドレスのみ許可するポリシーを Cloudflare ダッシュボードで設定する。

Phase 3 のフロントは **Cloudflare Pages** にホスティングするため、CORS を避けるために同一オリジン構成を採用する。Worker Route で `yourdomain.com/api/*` を本 Worker に向けることで、Pages（`yourdomain.com`）と同一オリジンになり CORS 不要となる。ローカル開発時の CORS は Phase 3 実装時に追加する。

## 採用技術

| 目的               | 採用                                                            |
| ------------------ | --------------------------------------------------------------- |
| Web フレームワーク | Hono v4                                                         |
| 認証               | Cloudflare Access (Zero Trust) — ログイン UI は Cloudflare 標準 |
| ルーティング       | Worker Route `yourdomain.com/api/*` — 同一オリジンで CORS 不要  |
| DB アクセス        | `drizzle-orm/d1` + 既存 `@english-phrase/db` スキーマ           |
| CORS               | Phase 3 実装時にローカル開発向けのみ追加                        |

## URL 設計

```
yourdomain.com/*      → Cloudflare Pages（フロント / Phase 3）
yourdomain.com/api/*  → Workers（本 Worker）← Worker Route で振り分け
```

## 認証フロー

```
ユーザー
  → yourdomain.com/api/v1/phrase
  → Cloudflare Access (エッジで認証・許可メールをブロック) ← 主防衛
  → Worker → Hono ルート → D1 → レスポンス

yourdomain.com 全体を Access 保護（フロント SPA 含む）→ フロントにアクセスした時点でログイン確立
workers.dev URL → workers_dev = false で完全閉鎖（独自ドメイン経由が唯一のアクセス経路。開けたままだと Cloudflare Access を迂回できるため閉鎖。Worker 内 auth 不要）
```

---

## 実装ファイル一覧

| ファイル                        | 操作           |
| ------------------------------- | -------------- |
| `apps/api/package.json`         | 更新           |
| `apps/api/wrangler.toml`        | 新規           |
| `apps/api/tsconfig.json`        | 新規           |
| `apps/api/src/index.ts`         | 新規           |
| `apps/api/src/routes/phrase.ts` | 新規           |
| `package.json` (root)           | スクリプト追加 |

---

## 実装詳細

### `apps/api/package.json`

```json
{
  "name": "api",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "@english-phrase/db": "workspace:*",
    "drizzle-orm": "^0.44.0",
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

### `apps/api/wrangler.toml`

```toml
name = "english-phrase-api"
main = "src/index.ts"
compatibility_date = "2025-01-01"
workers_dev = false   # workers.dev URL を完全閉鎖

routes = [
  { pattern = "yourdomain.com/api/*", zone_name = "yourdomain.com" }
]

[[d1_databases]]
binding = "DB"
database_name = "english-phrase-db"
database_id = "<CF_D1_DATABASE_ID>"   # root .env の CF_D1_DATABASE_ID と同じ値
```

> `yourdomain.com` は実際のドメインに置き換える。

### `apps/api/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src"]
}
```

### `apps/api/src/index.ts`

```typescript
import { Hono } from "hono";
import { phraseRoute } from "./routes/phrase";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();
app.route("/api/v1", phraseRoute);

export default app;
```

### `apps/api/src/routes/phrase.ts`

```typescript
import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { sql } from "drizzle-orm";
import { phrases } from "@english-phrase/db";

type Bindings = { DB: D1Database };

type PhraseResponse = {
  id: number;
  word: string;
  meaning: string | null;
  partOfSpeech: string | null;
  example: string | null;
  exampleTranslation: string | null;
  notionCreatedAt: string | null;
};

export const phraseRoute = new Hono<{ Bindings: Bindings }>();

phraseRoute.post("/phrase", async (c) => {
  const db = drizzle(c.env.DB);
  const result = await db
    .select({
      id: phrases.id,
      word: phrases.word,
      meaning: phrases.meaning,
      partOfSpeech: phrases.partOfSpeech,
      example: phrases.example,
      exampleTranslation: phrases.exampleTranslation,
      notionCreatedAt: phrases.notionCreatedAt,
    })
    .from(phrases)
    .orderBy(sql`RANDOM()`)
    .limit(1);
  if (result.length === 0) return c.json({ error: "No phrases found" }, 404);
  return c.json<PhraseResponse>(result[0]);
});
```

### root `package.json` に追加するスクリプト

```json
"api:dev": "pnpm --filter api run dev",
"api:deploy": "pnpm --filter api run deploy"
```

---

## Cloudflare 側の手動設定（デプロイ後）

### Worker Route 設定

`wrangler.toml` の `routes` に記載のため `wrangler deploy` 時に自動登録される。
ドメインが Cloudflare DNS 管理下であることが前提。

### Cloudflare Access 設定

1. Zero Trust → Access → Applications → "Add an application"
2. Type: **Self-hosted**、Application domain: `yourdomain.com`（フロント・API 全体を保護）
3. Policy: Allow → Emails → 許可するメールアドレスを列挙

> フロント（Pages）へのアクセス時点で Access ログインが完了するため、その後の fetch("/api/v1/phrase") は認証済みセッションで届く。

---

## 検証手順

1. `pnpm api:dev` でローカル起動
2. `POST http://localhost:8787/api/v1/phrase` → ランダムフレーズ JSON を確認（Worker 単体の動作確認）
3. `pnpm api:deploy` でデプロイ（Worker Route も自動登録）
4. Cloudflare Access ポリシーを `yourdomain.com` に設定
5. 未認証で `https://yourdomain.com` → Cloudflare ログイン画面へリダイレクトされることを確認
6. Access 認証後に `POST https://yourdomain.com/api/v1/phrase` → ランダムフレーズ JSON を確認

> **注**: same-origin 配線・Pages 配下からの `/api/*` 呼び出し・Access 適用後の結合確認は Phase 3（フロント実装）で行う。

---

## Phase 2.2（将来）

`POST /api/v1/voice` — 英文またはレコード ID を受け取り音声を返す
