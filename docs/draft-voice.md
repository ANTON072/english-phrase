# 音声読み上げ機能

- DBのwordを音声で読み上げる機能を追加したい。読み上げ対象は `word` のみ。
- web frontのQuestionCardにvoiceボタンを設置し、タップすると音声が再生する。

## 採用方針

記録日: 2026-04-15

音声生成には OpenAI の Text-to-Speech API を使い、モデルは `gpt-4o-mini-tts` を採用する。

`Text-to-Speech API` は `POST /v1/audio/speech` というAPIの入口で、`gpt-4o-mini-tts` はそこで指定する音声生成モデル。旧来の `tts-1` / `tts-1-hd` は使わない。

採用理由:

- 英語学習者向けに、`instructions` で発話の明瞭さや速度感を調整できる。
- OpenAI公式ドキュメント上で新しいTTSモデルとして案内されている。
- このアプリはリアルタイム会話ではなく、単語の再生が中心なので、低遅延より聞き取りやすさを優先する。
- R2キャッシュを前提にすれば、個人開発でも運用コストを小さくできる。

## APIリクエスト

基本設定:

- model: `gpt-4o-mini-tts`
- voice: `coral`
- response_format: `mp3`
- instructions: `Speak clearly at a natural pace for English learners.`

リクエスト例:

```json
{
  "model": "gpt-4o-mini-tts",
  "voice": "coral",
  "input": "run into",
  "instructions": "Speak clearly at a natural pace for English learners.",
  "response_format": "mp3"
}
```

声はまず `coral` を使う。必要であれば後で `alloy`、`marin`、`cedar` も試す。公式ドキュメントでは `marin` / `cedar` が高品質候補として案内されているが、最初は実装を単純にするため固定値でよい。

## 実装方針

ブラウザから直接OpenAI APIを呼ばない。APIキーを隠すため、`apps/api` の Cloudflare Workers/Hono 側に音声生成エンドポイントを追加する。

想定エンドポイント:

```txt
POST /api/v1/speech
```

リクエストボディ:

```json
{
  "phraseId": 123,
  "text": "run into"
}
```

レスポンス:

```txt
Content-Type: audio/mpeg
```

処理の流れ:

1. Webフロントのvoiceボタンを押す。
2. フロントから `POST /api/v1/speech` に `phrase.id` と `word` を送る。
3. Workers側でOpenAI `POST /v1/audio/speech` を呼ぶ。
4. 返ってきたmp3を `audio/mpeg` としてブラウザに返す。
5. ブラウザで音声を再生する。

OpenAI APIキーは Cloudflare Workers のSecretに保存する。

```bash
wrangler secret put OPENAI_API_KEY
```

## コスト方針

価格は変更される可能性があるため、実装前にOpenAI公式Pricingを再確認すること。

`gpt-4o-mini-tts` は音声出力ベースの課金。目安として約 `$0.015 / 分`。

短い英単語・英語フレーズでは、1回あたりの生成コストはかなり小さい。ただし再生のたびに生成すると無駄が出るため、生成済みmp3はR2にキャッシュする。

概算:

```txt
gpt-4o-mini-tts:
$0.015 / 60秒 = $0.00025 / 秒
5秒の音声 = 約 $0.00125
1,000回生成 = 約 $1.25
10,000回生成 = 約 $12.50
```

個人開発では、まず月額使用上限を `$5` から `$10` 程度に設定しておく。

## R2キャッシュ方針

生成済みmp3は Cloudflare R2 に保存する。初回再生時だけOpenAIで音声を生成し、2回目以降はR2から返す。

キャッシュキー:

```txt
speech/{model}/{voice}/{phrase.id}-{text_hash}.mp3
```

方針:

- 初回再生時にOpenAIでmp3を生成する。
- 生成したmp3をR2に保存する。
- 生成済み音声がR2にあればOpenAIを呼ばずにR2のmp3を返す。
- `phrase.id` だけでなく `model`, `voice`, `text_hash` をキーに含める。モデル・声・テキストが変わった場合に別音声として扱えるようにするため。
- D1には必須で保存しない。まずはR2のオブジェクト存在確認でキャッシュ判定する。
- 将来的に管理画面や一覧が必要になったら、D1に `phrase_id`, `model`, `voice`, `text_hash`, `r2_key`, `created_at` を保存する。

1フレーズを一度だけ生成してキャッシュすれば、ユーザーが何度再生してもOpenAI側の追加課金は発生しない。

Workers binding例:

```toml
[[r2_buckets]]
binding = "VOICE_CACHE"
bucket_name = "english-phrase-voice-cache"
```

Workers側の処理イメージ:

```txt
1. textからtext_hashを作る
2. R2で speech/{model}/{voice}/{phrase.id}-{text_hash}.mp3 を探す
3. あればR2のmp3を audio/mpeg で返す
4. なければOpenAIで生成する
5. 生成結果をR2にputする
6. 生成したmp3を audio/mpeg で返す
```

## 実装前に用意するもの

最小構成では、OpenAI APIキー、R2 bucket、WorkerのR2 binding、Worker Secret が揃えば実装に入れる。

### OpenAI

- OpenAI APIキーを発行する。
- APIの課金設定を有効化する。
- 月額使用上限を設定する。個人開発では最初は `$5` から `$10` 程度。
- 実装直前に `gpt-4o-mini-tts` の最新料金を再確認する。
- 初期voiceは `coral` にする。

### Cloudflare

- R2 bucketを作成する。
- bucket名は `english-phrase-voice-cache` を想定する。
- `apps/api` のWorkerにR2 bindingを追加する。
- binding名は `VOICE_CACHE` にする。
- Worker SecretにOpenAI APIキーを登録する。

```bash
wrangler secret put OPENAI_API_KEY
```

ローカル開発用と本番用でR2 bucketは分けない。実装を簡単にするため、まずは同じbucketを使う。

### API設計

- 音声生成エンドポイントは `POST /api/v1/speech` にする。
- リクエストボディは `phraseId` と `text` を受け取る。

```json
{
  "phraseId": 123,
  "text": "run into"
}
```

- レスポンスは `audio/mpeg` を直接返す。
- キャッシュキーは以下の形式にする。

```txt
speech/{model}/{voice}/{phraseId}-{text_hash}.mp3
```

### フロントエンド

- 読み上げ対象は `word` のみにする。
- 初期実装では `QuestionCard` にvoiceボタンを置く。
- 生成中はvoiceボタン内のアイコンで状態を示す。
- 再生中もvoiceボタン内のアイコンで状態を示す。
- エラー時はtoastで表示する。
- 連打対策として、生成中または再生中はボタンをdisabledにする。

### 表示・制限

- ユーザーに「AI生成音声です」と分かる表示を入れる。
- 音声生成対象は英語テキストに限定する。
- 空文字を弾く。
- 長すぎるテキストを弾く。初期上限は500文字程度にする。

### 実装時に確認するファイル

- `apps/api/src/index.ts`
- `apps/api/src/routes/phrase.ts`
- `apps/web/src/components/QuestionCard.tsx`
- `apps/web/src/constants.ts`
- `docs/draft-voice.md`

## 注意点

- OpenAIのポリシー上、ユーザーには「この音声はAI生成である」と分かる表示が必要。
- デフォルトの出力形式はmp3。一般用途ではmp3でよい。
- 低遅延重視ならwav/pcmも候補だが、このアプリではmp3で十分。
- APIキーは必ずWorkers側に置き、フロントエンドには出さない。
- 入力テキストは英語の単語または例文に限定する。

## 参考リンク

- https://developers.openai.com/api/docs/guides/text-to-speech
- https://platform.openai.com/docs/models/gpt-4o-mini-tts
- https://openai.com/api/pricing/
