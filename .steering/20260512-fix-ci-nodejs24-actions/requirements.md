# requirements.md

## 作業概要

GitHub Actions の Node.js 20 deprecation 警告を解消する。

## 問題

```
Node.js 20 actions are deprecated. The following actions are running on Node.js 20:
  - actions/checkout@v4
  - pnpm/action-setup@v4
Actions will be forced to run with Node.js 24 by default starting June 2nd, 2026.
```

## 対象ファイル

- `.github/workflows/deploy.yml`
- `.github/workflows/sync.yml`

## 修正方針

各アクションの Node.js 24 対応済みメジャーバージョンにアップデートする:

| アクション | 現在 | 更新後 |
|---|---|---|
| `actions/checkout` | `@v4`（Node.js 20）| `@v4` → `@v6`（Node.js 24）|
| `pnpm/action-setup` | `@v4`（Node.js 20）| `@v4` → `@v6`（Node.js 24）|

`actions/setup-node@v4` は警告に含まれていないため変更しない。
