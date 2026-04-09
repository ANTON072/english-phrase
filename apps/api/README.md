# english-phrase-api

Cloudflare Workers + Hono による英語フレーズ API。

## 事前準備

`wrangler.toml` の `<CF_D1_DATABASE_ID>` を実際の値に書き換える。  
値は root の `.env` に記載の `CF_D1_DATABASE_ID` を使用。

## ローカル開発

### 1. ローカル D1 にスキーマを適用（初回のみ）

```bash
npx wrangler d1 execute english-phrase-db \
  --local \
  --file=../../packages/db/migrations/0000_fluffy_impossible_man.sql \
  --config=wrangler.toml
```

### 2. 開発サーバー起動

```bash
# リポジトリルートから
pnpm api:dev

# または apps/api から
pnpm dev
```

`http://localhost:8787` で起動する。

### 3. 動作確認

```bash
curl -X POST http://localhost:8787/api/v1/phrase
```

ランダムなフレーズ JSON が返ればOK。

---

## デプロイ

### 前提条件

- Cloudflare アカウントにドメインが登録済み（DNS オレンジ雲）
- `wrangler.toml` の `[env.production]` にドメインを設定済み

```toml
[env.production]
routes = [
  { pattern = "yourdomain.com/api/*", zone_name = "yourdomain.com" }
]
```

### 1. デプロイ実行

```bash
# リポジトリルートから
pnpm api:deploy --env production

# または apps/api から
pnpm deploy --env production
```

### 2. Cloudflare Access 設定（初回のみ）

1. [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) → Access → Applications
2. "Add an application" → Type: **Self-hosted**
3. Application domain: `yourdomain.com`（フロント・API 全体を保護）
4. Policy: Allow → Emails → 許可するメールアドレスを列挙

### 3. 本番動作確認

Access 認証後に以下を実行:

```bash
curl -X POST https://yourdomain.com/api/v1/phrase
```

---

## レスポンス仕様

`POST /api/v1/phrase` — ランダムに 1 件返す

```json
{
  "id": 1,
  "word": "serendipity",
  "meaning": "思いがけない幸運",
  "partOfSpeech": "noun",
  "example": "It was pure serendipity.",
  "exampleTranslation": "純粋な思いがけない幸運だった。",
  "notionCreatedAt": "2024-01-01"
}
```
