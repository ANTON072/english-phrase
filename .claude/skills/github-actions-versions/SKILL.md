# GitHub Actions バージョン管理

`.github/workflows/` 以下のファイルを作成・編集する際に必ずこのスキルを参照する。

## 使用タイミング

- GitHub Actions ワークフローファイルを新規作成するとき
- 既存のワークフローファイルを編集するとき
- CI/CDパイプラインの設定を変更するとき

## 承認済みバージョン一覧

以下のバージョンを使用すること。古いバージョンを見かけたら必ず最新に更新する。

| Action | 使用バージョン | 備考 |
|--------|--------------|------|
| `actions/checkout` | `@v4` | Node.js 20ランタイム。v5リリース待ち |
| `actions/setup-node` | `@v5` | Node.js 24ランタイム対応済み |
| `pnpm/action-setup` | `@v4` | |
| `actions/cache` | `@v4` | |
| `actions/upload-artifact` | `@v4` | |
| `actions/download-artifact` | `@v4` | |

## 禁止バージョン

- `actions/setup-node@v4` — Node.js 20ランタイム。2026年6月以降に廃止予定

## 確認方法

ワークフローファイルを編集した後、以下を grep して古いバージョンが残っていないか確認する:

```bash
grep -r "setup-node@v[0-3]" .github/
```
