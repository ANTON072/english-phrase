# 音声読み上げ機能 実装計画

## Phase 0: 事前準備

目的: 実装に入れる状態を作る。

やること:

- OpenAI APIキーを用意する。
- OpenAI側で月額上限を設定する。
- Cloudflare R2 bucket `english-phrase-voice-cache` を作成する。
- `apps/api` のWorkerにR2 binding `VOICE_CACHE` を追加する。
- Worker Secretに `OPENAI_API_KEY` を登録する。

完了条件:

- Workerから `OPENAI_API_KEY` と `VOICE_CACHE` を参照できる。
- ローカル・本番で同じR2 bucketを使う方針が反映されている。

## Phase 1: API側に音声生成エンドポイントを追加

目的: `word` を渡すとmp3が返るAPIを作る。

やること:

- `POST /api/v1/speech` を追加する。
- リクエストで `phraseId` と `text` を受け取る。
- `text` は `word` のみを想定する。
- 空文字・長すぎる文字列をバリデーションする。
- OpenAI `POST /v1/audio/speech` を呼び出す。
- `audio/mpeg` でmp3を返す。

完了条件:

- APIに `phraseId` と `text` をPOSTするとmp3が返る。
- OpenAI APIキーはフロントに露出しない。
- エラー時は適切なHTTPステータスとJSONを返す。

## Phase 2: R2キャッシュをAPIに組み込む

目的: 生成済み音声をR2に保存し、再生成を避ける。

やること:

- `text_hash` を生成する。
- キャッシュキーを作る。

```txt
speech/{model}/{voice}/{phraseId}-{text_hash}.mp3
```

- R2に既存mp3があるか確認する。
- あればOpenAIを呼ばずにR2のmp3を返す。
- なければOpenAIで生成してR2に保存する。
- 保存後、そのmp3を返す。

完了条件:

- 1回目はOpenAI生成される。
- 2回目以降はR2から返る。
- 同じ `phraseId` でも `text`、`model`、`voice` が変われば別キャッシュになる。

## Phase 3: フロントにvoiceボタンを追加

目的: `QuestionCard` から `word` の音声を再生できるようにする。

やること:

- `QuestionCard` にvoiceボタンを追加する。
- `phrase.id` と `phrase.word` を `/api/v1/speech` に送る。
- 返ってきたmp3をブラウザで再生する。
- 生成中はボタン内アイコンで状態表示する。
- 再生中もボタン内アイコンで状態表示する。
- 生成中・再生中はボタンをdisabledにする。

完了条件:

- `word` の音声を再生できる。
- 連打しても多重リクエストや多重再生が起きにくい。
- `example` は読み上げ対象にしない。

## Phase 4: エラーUIと表示ポリシー

目的: ユーザーに分かる形で失敗とAI生成音声を扱う。

やること:

- API失敗時にtoastを表示する。
- 再生失敗時にもtoastを表示する。
- 「AI生成音声です」と分かる表示を追加する。
- 表示場所は邪魔にならない位置にする。

完了条件:

- エラーがalertやconsoleだけで終わらない。
- ユーザーがAI生成音声だと分かる。
- 通常の学習UIを邪魔しない。

## Phase 5: 動作確認と仕上げ

目的: 実装が壊れていないことを確認する。

やること:

- API単体でmp3が返ることを確認する。
- 同じ単語を2回再生して、2回目がR2キャッシュになることを確認する。
- Web UIから再生できることを確認する。
- 生成中・再生中・エラーtoastを確認する。
- `pnpm web:build` を実行する。
- 必要なら `pnpm lint` または `pnpm check` を実行する。

完了条件:

- ビルドが通る。
- 音声再生が動く。
- R2キャッシュが効く。
- UI状態が破綻しない。

## 実装順メモ

実装順としては、Phase 1 -> Phase 2 -> Phase 3 が本体。Phase 0は事前準備、Phase 4とPhase 5は品質確認。

最初の実装PRとしては、Phase 1からPhase 4までをまとめても大きすぎない。R2まわりで詰まる可能性がある場合は、Phase 1だけ先に切って、その後Phase 2以降を足す。
