---
name: prd-writing
description: プロダクト要求定義書(PRD)を作成するための詳細ガイドとテンプレート。PRD作成時にのみ使用。
allowed-tools: Read, Write
---

# PRD作成スキル

会話から得た情報をもとに、スコープを絞った要件ドキュメントを `docs/product-requirements.md` に生成する。

## プロセス

### 1. 情報収集

`docs/ideas/initial-requirements.md` があれば読む。なければ会話の内容だけで進める。

### 2. ドラフト生成

`./template.md` に従ってドキュメントを生成する。

### 3. 確認

不明点があれば1〜2点だけユーザーに確認する。細部の推測は許容し、完璧を求めない。

## 出力先

```
docs/product-requirements.md
```

## 重要な原則

- 「自分が何を作るか・何を作らないか」を明確にする
- 箇条書き中心で、1ページ以内に収める
