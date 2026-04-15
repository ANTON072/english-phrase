name: post-pending-review
description: 指定されたPRのコードレビューを実施し、pending reviewとして投稿する
tools:

- bash
- gh (GitHub CLI)

---

# PRレビュー作業

PR $ARGUMENTS のコードレビューを実施してください

## 実行手順

### 1. PR情報の取得

ghコマンドでPRの詳細を取得してください：

```bash
gh pr view $ARGUMENTS
gh pr diff $ARGUMENTS
```

### 2. レビュー実施

agents code-reviewer を利用してコードレビューを実施してください

### 3. レビュー結果をpending reviewとして投稿

`gh api` を使って直接投稿してください。JSONファイルは作成せず、ヒアドキュメントで直接渡します。

#### フィールド説明

- `path`: 対象ファイルのリポジトリルートからの相対パス
- `body`: コメント内容
- `line`: コメント対象の最終行（新しいファイル側の行番号）
- `side`: 追加/変更行は `"RIGHT"`、削除行は `"LEFT"`
- `start_line`: 複数行コメントの場合のみ指定（開始行番号）
- `start_side`: `start_line` を指定する場合は必須（通常は `"RIGHT"`）

#### 投稿コマンド

```bash
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
PR_NUMBER=$ARGUMENTS

gh api "repos/${REPO}/pulls/${PR_NUMBER}/reviews" \
  --method POST \
  --input - << 'EOF'
{
  "body": "レビュー全体のサマリー",
  "comments": [
    {
      "path": "対象ファイルのパス",
      "body": "コメント内容",
      "line": 42,
      "side": "RIGHT"
    }
  ]
}
EOF
```

#### 修正提案がある場合

`comments` 配列に含めるオブジェクトの `body` で、以下のようにGitHub suggestion形式を使用してください：

````json
{
  "body": "レビュー全体のサマリー",
  "comments": [
    {
      "path": "src/example.py",
      "line": 42,
      "side": "RIGHT",
      "body": "変数名をより明確にすることを提案します：\n\n```suggestion\nuser_count = len(users)\n```"
    }
  ]
}
````

### 4. 完了報告

投稿完了後、以下を報告してください：

- pending review が作成されたこと
- ユーザーが GitHub UI で確認・編集後に submit する必要があること
- PR の URL

## 注意事項

- `line` は差分の中での行番号（新しいファイル側の行番号）を指定する
- 複数行コメントの場合は `start_line` と `start_side` の両方を指定する
- コメントがない場合は `comments` を空配列にして全体コメントのみ投稿可能
- pending review は作成者本人にのみ見え、submit するまで他の人には見えない
