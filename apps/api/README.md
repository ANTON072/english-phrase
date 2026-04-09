# english-phrase-api

Cloudflare Workers + Hono による英語フレーズ API。

## 事前準備

`apps/api/wrangler.toml` には既に `database_id` が設定されているため、通常は書き換え不要。  
利用する D1 データベースを変更したい場合のみ、`database_id` を対象環境の値に更新する。

> `database_id` は識別子であり認証情報ではないため、public リポジトリへのコミットは問題ない。  
> アクセス制御は `CLOUDFLARE_API_TOKEN` が担っており、こちらは `.env` で管理され git には含まれない。

## ローカル開発

### 1. ローカル D1 にスキーマを適用

以下のコマンドは **`apps/api` ディレクトリで実行**する。

**初回：**

```bash
npx wrangler d1 execute english-phrase-db \
  --local \
  --file=../../packages/db/migrations/0000_fluffy_impossible_man.sql \
  --config=wrangler.toml
```

**スキーマ変更時：**  
`pnpm db:generate` で新しいマイグレーションファイルを生成後、そのファイルのみ適用する。

```bash
npx wrangler d1 execute english-phrase-db \
  --local \
  --file=../../packages/db/migrations/0001_xxxxx.sql \
  --config=wrangler.toml
```

> `0000_...` を再実行するとテーブルが既に存在するためエラーになる。

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
  { pattern = "english-phrase.work/api/*", zone_name = "english-phrase.work" }
]
```

### 1. デプロイ実行

```bash
# リポジトリルートから
pnpm api:deploy

# または apps/api から
pnpm deploy
```

### 2. Cloudflare Access 設定（初回のみ）

1. [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) → Access → Applications
2. "Add an application" → Type: **Self-hosted**
3. Application domain: `english-phrase.work`（フロント・API 全体を保護）
4. Policy: Allow → Emails → 許可するメールアドレスを列挙

### 3. 本番動作確認

curl は Cloudflare Access のセッションを共有しないため使用不可。  
ブラウザの DevTools コンソールで確認する。

```javascript
// ブラウザで english-phrase.work にアクセスして Access 認証後、コンソールで実行
const res = await fetch("/api/v1/phrase", { method: "POST" });
console.log(await res.json());
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
