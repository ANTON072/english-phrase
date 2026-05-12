# 設計書

## アーキテクチャ概要

既存のモノレポ構成（packages/db → packages/types → apps/api → apps/web）の変更フローに従って、DB スキーマ → API → Web の順に実装する。

```
packages/db/src/schema.ts     ← starred カラム追加
packages/db/migrations/       ← マイグレーション SQL 自動生成
packages/types/src/phrase.ts  ← PhraseResponse に starred 追加
packages/types/src/star.ts    ← StarRequest 型 (新規)
apps/api/src/routes/star.ts   ← POST /api/v1/star (新規)
apps/api/src/routes/phrase.ts ← 重み付きランダム SELECT に変更
apps/api/src/index.ts         ← starRoute を登録
apps/web/src/constants.ts     ← STAR_ENDPOINT 追加
apps/web/src/hooks/useStar.ts ← スタートグル API 呼び出し (新規)
apps/web/src/components/QuizCard.tsx ← スターボタン追加
apps/web/src/mocks/handlers.ts ← starred フィールドと star エンドポイントのモック
```

## コンポーネント設計

### 1. packages/db — スキーマ変更

**責務**:

- `phrases` テーブルに `starred integer not null default 0` カラムを追加

**実装の要点**:

- `schema.ts` に `starred: int("starred").notNull().default(0)` を追加
- `pnpm db:generate` で `0001_*.sql` マイグレーションを自動生成
- `Phrase` 型エクスポートに `starred` を含める

### 2. packages/types — 型追加

**責務**:

- `PhraseResponse` に `starred: number` フィールドを追加（0 or 1）
- `StarRequest` 型を新規作成

**実装の要点**:

```typescript
// phrase.ts に追加
starred: number;  // 0 = 未スター, 1 = スター済み

// star.ts (新規)
export type StarRequest = {
  phraseId: number;
  starred: boolean;
};
```

- `index.ts` から `StarRequest` を re-export する

### 3. apps/api/src/routes/phrase.ts — 重み付きランダム

**責務**:

- スター済み単語の出現確率を 1/10 に下げる

**実装の要点**:

SQLite の `RANDOM()` に重みを掛けた式で ORDER BY する:

```sql
ORDER BY (CASE WHEN starred = 1 THEN ABS(RANDOM()) % 10 ELSE ABS(RANDOM()) % 100 END)
```

より簡潔な方法として `RANDOM() * (CASE WHEN starred = 1 THEN 0.1 ELSE 1.0 END)` を使う:

```typescript
.orderBy(sql`RANDOM() * (CASE WHEN ${phrases.starred} = 1 THEN 0.1 ELSE 1.0 END)`)
```

- `phraseSelect` に `starred: phrases.starred` を追加する

### 4. apps/api/src/routes/star.ts — スタートグルエンドポイント (新規)

**責務**:

- `POST /api/v1/star { phraseId, starred }` を受け付け、D1 の `starred` カラムを更新する

**実装の要点**:

```typescript
// リクエストバリデーション
// phraseId: number、starred: boolean を検証
// drizzle update で phrases.starred を 0/1 に更新
// 対象行が存在しない場合は 404
```

エラーケース:
- `phraseId` が number でない → 400
- `starred` が boolean でない → 400
- 対象フレーズが存在しない → 404

### 5. apps/web/src/hooks/useStar.ts — スタートグル hook (新規)

**責務**:

- スター状態をローカルで楽観的更新し、API を非同期呼び出しする
- エラー時はロールバックしてトーストを表示する

**実装の要点**:

```typescript
export function useStar(phraseId: number, initialStarred: number) {
  const [starred, setStarred] = useState(initialStarred);

  const toggle = useCallback(async () => {
    const newStarred = starred === 0 ? 1 : 0;
    setStarred(newStarred); // 楽観的更新
    try {
      await fetch(STAR_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phraseId, starred: newStarred === 1 }),
      });
    } catch {
      setStarred(starred); // ロールバック
      toast.error("スターの更新に失敗しました");
    }
  }, [phraseId, starred]);

  return { starred, toggle };
}
```

- `phraseId` または `initialStarred` が変わったら `starred` をリセットする（`useEffect`）

### 6. apps/web/src/components/QuizCard.tsx — スターボタン追加

**責務**:

- スターボタンを表示し、`useStar` hookに接続する

**実装の要点**:

- `lucide-react` の `Star` アイコンを使用（塗りつぶし: `fill-current`、輪郭: デフォルト）
- Voice ボタンと同じ行に並べる（ヘッダー行の右側など）
- スターボタンは `pageState` に関わらず常に表示する

## データフロー

### スタートグル

```
1. ユーザーがスターボタンをタップ
2. useStar.toggle() → starred をローカルで即時反転（楽観的更新）
3. POST /api/v1/star { phraseId, starred: boolean }
4. API が D1 の phrases.starred を 0/1 で UPDATE
5. エラー時: starred をロールバック + toast.error()
```

### 重み付きフレーズ取得

```
1. POST /api/v1/phrase
2. SELECT ... FROM phrases ORDER BY RANDOM() * (CASE WHEN starred = 1 THEN 0.1 ELSE 1.0 END) LIMIT 1
3. starred フィールドを含む PhraseResponse を返す
4. Web 側: useStar(phrase.id, phrase.starred) で初期状態を設定
```

## エラーハンドリング戦略

### apps/api/src/routes/star.ts

| エラー | HTTP | レスポンス |
|--------|------|------------|
| phraseId が number でない | 400 | `{ error: "phraseId must be a number" }` |
| starred が boolean でない | 400 | `{ error: "starred must be a boolean" }` |
| 対象フレーズが存在しない | 404 | `{ error: "Phrase not found" }` |

### apps/web/src/hooks/useStar.ts

- fetch 失敗時: starred をロールバック + `toast.error("スターの更新に失敗しました")`

## テスト戦略

### ユニットテスト

- 既存テストのみ（純粋関数がないため新規テストは追加しない）

### 手動動作確認

- `pnpm dev` 起動後、MSW モックを使ってスタートグルの UI 動作を確認
- `starred` フィールドが QuizCard に正しく反映されることを確認

## 依存ライブラリ

新規追加なし（`lucide-react` の `Star` アイコンは既存パッケージに含まれる）

## ディレクトリ構造

```
packages/
  db/
    src/schema.ts              ← starred カラム追加
    migrations/0001_*.sql      ← 自動生成
  types/
    src/phrase.ts              ← starred フィールド追加
    src/star.ts                ← 新規: StarRequest 型
    src/index.ts               ← StarRequest を re-export

apps/
  api/src/
    routes/phrase.ts           ← 重み付き ORDER BY
    routes/star.ts             ← 新規: POST /star
    index.ts                   ← starRoute 登録
  web/src/
    constants.ts               ← STAR_ENDPOINT 追加
    hooks/useStar.ts           ← 新規
    components/QuizCard.tsx    ← スターボタン追加
    mocks/handlers.ts          ← starred モック + star エンドポイント
```

## 実装の順序

1. `packages/db` スキーマ変更 + マイグレーション生成
2. `packages/types` 型追加
3. `apps/api` phrase ルート更新（starred フィールド + 重み付きランダム）
4. `apps/api` star ルート新規作成 + index.ts 登録
5. `apps/web` constants.ts 更新
6. `apps/web` useStar hook 新規作成
7. `apps/web` QuizCard スターボタン追加
8. `apps/web` mocks/handlers.ts 更新
9. 品質チェック（lint / typecheck / build）

## セキュリティ考慮事項

- `phraseId` の型バリデーションは既存の `speech.ts` パターンに従う
- Cloudflare Access による認証は既存のまま（変更不要）

## パフォーマンス考慮事項

- `RANDOM() * weight` による ORDER BY は SQLite のフルテーブルスキャンを引き起こすが、行数が 1〜2 万行程度なら問題ない（既存の `ORDER BY RANDOM()` と同等）

## 将来の拡張性

- `starred` を `boolean` ではなく `integer` で持つことで、将来的に複数段階の優先度（例: 0=通常, 1=スター, 2=重要）への拡張が容易
