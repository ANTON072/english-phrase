# GitHub Actions による自動デプロイ実装プラン

## 目的

`main` ブランチへのマージをトリガーに、API・Web を本番環境へ自動デプロイする。
現在はローカルから `pnpm release` を手動実行している。

---

## 変更内容

### `.github/workflows/deploy.yml` — 新規作成

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:                   # 手動実行（障害復旧用）

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10                  # package.json に packageManager がないため明示必須

      - uses: actions/setup-node@v4
        with:
          node-version: '20.19'        # engines: >=20.19.0 に合わせて明示
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - run: pnpm release
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

`pnpm release` の内部では `concurrently` により API・Web が並列デプロイされる。

- `api:deploy` → `wrangler deploy --env production`（Cloudflare Workers）
- `web:deploy` → `pnpm run build && wrangler deploy --env production`（Cloudflare Pages）

---

## GitHub Secrets の確認

以下は sync.yml で既に登録済みのため、**追加作業は不要**。

| Secret 名 | 用途 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | wrangler が参照 |
| `CLOUDFLARE_ACCOUNT_ID` | wrangler が参照 |

---

## 動作確認方法

1. `feature/gh-action-deploy` ブランチで `deploy.yml` を作成してコミット
2. `main` へ PR を作成しマージ
3. GitHub Actions タブで `Deploy to Production` ジョブが起動することを確認
4. `english-phrase-api` / `english-phrase-web` のデプロイが成功することを確認
5. `english-phrase.work` にアクセスして動作確認

---

## 注意点

- `push: branches: [main]` トリガーは **ワークフローファイルが main ブランチに存在する**ことが前提
  → 初回は feature ブランチで作成して main にマージすることで有効になる
- DB マイグレーションはスキーマ変更時のみ手動実行（自動化対象外）
