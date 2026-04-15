# web

English Phrase の Web フロントエンド。Vite + React + TanStack Router / Query + shadcn/ui で構成し、Cloudflare Workers Static Assets としてホスティングする。

## 開発

```bash
# モノレポルートから起動（DB・API・Web を同時起動）
pnpm dev

# web のみ起動
pnpm web:dev
```

- アプリ: http://localhost:5173
- `/api/*` へのリクエストは自動的に `http://localhost:8787`（wrangler dev）にプロキシされる

### MSW (モックモード)

実 API なしで UI を確認したい場合は `VITE_ENABLE_MSW=true` を付けて起動する。

```bash
VITE_ENABLE_MSW=true pnpm web:dev   # MSW が /api/v1/phrase をインターセプト
pnpm web:dev                         # 実 API (localhost:8787) に proxy
```

## shadcn コンポーネントの追加

```bash
cd apps/web
pnpm dlx shadcn@latest add <component>

# 例
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add card
```

## ビルド

```bash
pnpm web:build
```

`dist/` に成果物が生成される。

## デプロイ

Cloudflare Workers に Static Assets として配信する。

### 前提

```bash
# Cloudflare へのログイン（未認証の場合）
npx wrangler login
```

### 手順

```bash
# ビルド → デプロイ を一括実行
pnpm web:deploy
```

内部では以下を実行している:

```bash
tsc -b && vite build   # dist/ を生成
wrangler deploy        # dist/ を Cloudflare Workers にアップロード
```

### デプロイ設定（wrangler.toml）

| 項目             | 値                                                                |
| ---------------- | ----------------------------------------------------------------- |
| Worker 名        | `english-phrase-web`                                              |
| 配信ディレクトリ | `./dist`                                                          |
| 404 ハンドリング | `single-page-application`（すべて `index.html` にフォールバック） |
| 本番ルート       | `english-phrase.work/*`                                           |

### Cloudflare DNS の設定（初回のみ）

Cloudflare Workers のルーティングを apex ドメイン (`english-phrase.work`) で動作させるには、DNS レコードを **プロキシ有効（オレンジ雲）** にする必要があります。

1. Cloudflare ダッシュボード → 対象ドメイン → **DNS** を開く
2. `@` (apex) の A レコードを確認する
3. **Proxy status** を **Proxied（オレンジ雲）** に変更する

```
タイプ  名前  値（任意の IP）  プロキシ
A       @     192.0.2.1       Proxied ← ここをオンにする
```

> **Note**: IP アドレスはダミーのままで問題ありません。Cloudflare がリクエストを Workers にルーティングするため、実際の IP には到達しません。

> **Note**: API は `english-phrase.work/api/*`、Web は `english-phrase.work/*` にルーティングされます。より具体的なパターン (`/api/*`) が優先されるため、API と Web は競合しません。
