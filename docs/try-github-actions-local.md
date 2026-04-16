# GitHub Actions をローカルで試す（act）

`act` を使うと Docker でローカル実行できる。都度 push 不要。

## セットアップ

```bash
brew install act
```

Docker Desktop が起動していること。

## 基本的な使い方

リポジトリルートで実行する（`.github/workflows/` を自動で探すため）。

```bash
cd /path/to/english-phrase

# ワークフロー一覧確認
act --list

# workflow_dispatch をローカル実行
act workflow_dispatch

# Secrets を渡す
act workflow_dispatch --secret-file .secrets
```

## .secrets ファイル

`.secrets`（`.gitignore` 済みにすること）に環境変数を書いておく:

```
NOTION_API_KEY=xxx
NOTION_DATABASE_ID=xxx
CLOUDFLARE_API_TOKEN=xxx
CLOUDFLARE_ACCOUNT_ID=xxx
D1_DB_NAME=xxx
```

## 注意点

- 初回起動時に Runner イメージを選ぶ。`ubuntu-latest` は数GB あるので `Medium`（`catthehacker/ubuntu:act-latest`）を選ぶと速い
- `schedule` トリガーはローカルでは動かない。`workflow_dispatch` に変えて実行する
- wrangler が `--remote` で本物の D1 を叩くため、動作確認時は本番データに注意
