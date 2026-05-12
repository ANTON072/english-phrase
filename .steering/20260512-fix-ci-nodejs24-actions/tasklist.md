# tasklist.md

## タスクリスト

- [x] deploy.yml の `actions/checkout@v4` を `@v6` に更新
- [x] deploy.yml の `pnpm/action-setup@v4` を `@v6` に更新
- [x] sync.yml の `actions/checkout@v4` を `@v6` に更新
- [x] sync.yml の `pnpm/action-setup@v4` を `@v6` に更新

## 実装後の振り返り

- **実装完了日**: 2026-05-12
- **計画と実績の差分**: 計画通り。対象4箇所を全て更新。
- **学んだこと**: GitHub Actions のメジャーバージョンタグ（`@v4`）は互換性維持のため数年間変更されないことがあり、Node.js ランタイムの更新は新しいメジャーバージョン（`@v6`）でのみ行われる場合がある。`actions/checkout` と `pnpm/action-setup` はどちらも v6 で Node.js 24 対応済み。`actions/setup-node@v4` は今回の警告対象外（同 v4 系の中で既に Node.js 24 対応済みと推測）。
- **次回への改善提案**: GitHub Dependabot や Renovate を導入すれば、今後はアクションのバージョン更新を自動 PR で検知できる。
