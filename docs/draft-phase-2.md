# Phase 2

Honoを使ってCloudflare Workers上にAPIを作りたい。
DBはPhase1で利用したものを使う。

- POST `/api/v1/phrase` を実行するとレコードをランダムで1件返す。
- JWT認証アリ。
  - JWT認証は何を利用しましょうか。お金はかけたくない。
  - ログインはフロント側に任せたい。
  - 特定の人しかログインさせたくない
  - Firebase Authのメールアドレスログインをイメージしているが、Cloudflare なので利用しやすいものがいい。
- Phase 2.2で、音声APIも検討している。
  - POST `/api/v1/voice` に英文かレコードIDを渡すと、ボイスが返ってきてフロントで再生される。
