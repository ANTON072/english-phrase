# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール

- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## フェーズ1: DB スキーマ変更

- [x] `packages/db/src/schema.ts` に `starred` カラムを追加する
  - [x] `starred: int("starred").notNull().default(0)` を `phrases` テーブルに追加
  - [x] `Phrase` 型エクスポートに `starred` を含める
- [x] `pnpm db:generate` でマイグレーション SQL を生成する

## フェーズ2: 共有型の追加

- [x] `packages/types/src/phrase.ts` の `PhraseResponse` に `starred: number` を追加する
- [x] `packages/types/src/star.ts` を新規作成し `StarRequest` 型を定義する
- [x] `packages/types/src/index.ts` から `StarRequest` を re-export する

## フェーズ3: API 実装

- [x] `apps/api/src/routes/phrase.ts` を更新する
  - [x] `phraseSelect` に `starred: phrases.starred` を追加する
  - [x] `ORDER BY` を重み付きランダム (`RANDOM() * (CASE WHEN starred = 1 THEN 0.1 ELSE 1.0 END)`) に変更する
- [x] `apps/api/src/routes/star.ts` を新規作成する
  - [x] `parseBody` でリクエストバリデーション (`phraseId: number`, `starred: boolean`)
  - [x] Drizzle で `phrases.starred` を UPDATE する
  - [x] 対象フレーズが存在しない場合は 404 を返す
- [x] `apps/api/src/index.ts` に `starRoute` を登録する

## フェーズ4: Web 実装

- [x] `apps/web/src/constants.ts` に `STAR_ENDPOINT` を追加する
- [x] `apps/web/src/hooks/useStar.ts` を新規作成する
  - [x] 楽観的更新（ローカル state を先に反転）
  - [x] `fetch(STAR_ENDPOINT, ...)` で API 呼び出し
  - [x] エラー時に starred をロールバックし `toast.error()` を表示
  - [x] `phraseId` / `initialStarred` 変更時に state をリセット
- [x] `apps/web/src/components/QuizCard.tsx` にスターボタンを追加する
  - [x] `lucide-react` の `Star` アイコンを使用
  - [x] question / answer 両状態で常に表示する（`pageState` に依存しない）
  - [x] スター済みは塗りつぶし (`fill-current`)、未スターは輪郭のみ
  - [x] `useStar(phrase.id, phrase.starred)` を呼び出す
- [x] `apps/web/src/mocks/handlers.ts` を更新する
  - [x] `mockPhrases` に `starred: 0` フィールドを追加
  - [x] `STAR_ENDPOINT` の `POST` ハンドラを追加（成功レスポンスを返す）

## フェーズ5: 品質チェックと修正

- [ ] リントエラーがないことを確認する
  - [ ] `pnpm lint` を実行
- [ ] 型エラーがないことを確認する
  - [ ] `pnpm -F @english-phrase/web build` を実行 (tsc -b が走る)
- [ ] `apps/api` のテストが通ることを確認する
  - [ ] `pnpm -F @english-phrase/api test` を実行
- [ ] `apps/sync` のテストが通ることを確認する
  - [ ] `pnpm -F @english-phrase/sync test` を実行

---

## 実装後の振り返り

### 実装完了日

{YYYY-MM-DD}

### 計画と実績の差分

**計画と異なった点**:

- {計画時には想定していなかった技術的な変更点}

**新たに必要になったタスク**:

- {実装中に追加したタスク}

### 学んだこと

**技術的な学び**:

- {実装を通じて学んだ技術的な知見}

### 次回への改善提案

- {次回の機能追加で気をつけること}
