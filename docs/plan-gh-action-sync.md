# GitHub Actions による自動 Sync 実装プラン

## 目的

毎朝 4:00（JST）に Notion → D1 の同期を GitHub Actions で自動実行する。
Mac がなくても同期が走るようにする。

---

## 変更内容

### 1. `apps/sync/package.json` — CI 用スクリプト追加

現在の `sync` スクリプトは `--env-file=../../.env` を使っており、
`.env` ファイルが存在しない GitHub Actions 環境ではエラーになる。
CI 用に `.env` を参照しないスクリプトを追加する。

```json
"scripts": {
  "sync":    "tsx --env-file=../../.env src/index.ts",  // ローカル用（変更なし）
  "sync:ci": "tsx src/index.ts",                        // CI 用（追加）
  "test":    "vitest run"
}
```

### 2. ルート `package.json` — CI 用スクリプト追加

```json
"sync:ci": "pnpm --filter sync run sync:ci"
```

### 3. `.github/workflows/sync.yml` — 新規作成

```yaml
name: Notion → D1 Sync

on:
  workflow_dispatch:                   # 手動実行（初回確認・障害復旧用）
  schedule:
    - cron: '0 19 * * *'              # JST 04:00 = UTC 19:00

jobs:
  sync:
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

      - run: pnpm sync:ci
        env:
          NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
          NOTION_DATABASE_ID: ${{ secrets.NOTION_DATABASE_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          D1_DB_NAME: ${{ secrets.D1_DB_NAME }}
```

---

## GitHub Secrets の設定（手動作業）

リポジトリの **Settings > Secrets and variables > Actions** に以下を登録する。
値は `apps/sync/.env` を参照。

| Secret 名 | 内容 | 参照箇所 |
|---|---|---|
| `NOTION_API_KEY` | Notion API キー | `index.ts` で直接参照 |
| `NOTION_DATABASE_ID` | Notion データベース ID | `index.ts` で直接参照 |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API トークン | wrangler が参照 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare アカウント ID | wrangler が参照 |
| `D1_DB_NAME` | D1 データベース名 | `index.ts` で直接参照 |

> `CF_D1_DATABASE_ID` は `index.ts` でもwranglerでも参照されていないため不要。

---

## 動作確認方法

1. Secrets 設定後、一時的に `workflow_dispatch:` をトリガーに追加して手動実行
2. Actions タブでログを確認（全ステップが成功すること）
3. Cloudflare D1 の `phrases` テーブルが更新されていることを確認
4. 確認後、`workflow_dispatch:` は削除してもよい

---

## 注意点

- GitHub Actions の `schedule` は UTC で指定する（JST 4:00 = UTC 19:00）
- `schedule` トリガーは **main ブランチにマージされた後**に有効になる
- GitHub の無料枠（2,000 分/月）で十分動作する（1 回あたり数分）
