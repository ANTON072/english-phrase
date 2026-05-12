# requirements.md

## 作業概要

CIのdeployジョブでpnpmバージョン不一致エラーを修正する。

## 問題

```
Error: Multiple versions of pnpm specified:
  - version 10 in the GitHub Action config with the key "version"
  - version pnpm@11.1.0 in the package.json with the key "packageManager"
```

## 対象ファイル

- `.github/workflows/deploy.yml` — `version: 10` を削除
- `.github/workflows/sync.yml` — `version: 10` を削除

## 修正方針

`pnpm/action-setup@v4` は `version` が未指定の場合、`package.json` の `packageManager` フィールドを自動参照する。
既に `package.json` に `"packageManager": "pnpm@11.1.0"` が定義されているため、ワークフロー側の明示的な `version: 10` を削除するだけでよい。
