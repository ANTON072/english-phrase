# PR Review: feat: Phase 1 - Notion to Cloudflare D1 sync

対象PR: https://github.com/ANTON072/english-phrase/pull/1

## Findings

### 1. archived のみ更新されたときに同期境界が進まず、同じ変更を毎回再取得する

- 重要度: High
- 対象: [apps/sync/src/index.ts](../apps/sync/src/index.ts#L110), [apps/sync/src/index.ts](../apps/sync/src/index.ts#L126)

`archived` ページは `continue` で即座に捨てていますが、境界時刻の更新はその後に残ったページに依存しています。
このため、Notion 側で更新されたページが archived のみだった場合、`maxLastEditedTime` が進まず、`pages.length === 0` で終了します。
結果として次回実行時にも同じ archived ページを再取得し続けます。

削除を無視する仕様でも、同期境界は「今回観測した変更」ベースで前進させる必要があります。

### 2. 単語が空のページだけが更新された場合も同期境界が進まず、毎回同じ警告を出し続ける

- 重要度: High
- 対象: [apps/sync/src/index.ts](../apps/sync/src/index.ts#L135), [apps/sync/src/index.ts](../apps/sync/src/index.ts#L150)

`単語` が空のページは警告付きでスキップされていますが、更新分がすべてこのケースだった場合は `phrases.length === 0` で終了し、`sync_logs` が更新されません。
その結果、次回以降も同じ不正データを再取得し続け、永続的に同じ警告を出し続けます。

このケースは以下のどちらかに寄せる必要があります。

- 取得した変更の最大 `last_edited_time` で境界だけは進める
- 不正データとして同期全体を失敗扱いにして明示的に止める

### 3. sync_logs 読み取りの例外をすべて初回同期扱いにしており、障害を隠したまま全件同期にフォールバックする

- 重要度: Medium
- 対象: [apps/sync/src/index.ts](../apps/sync/src/index.ts#L67), [apps/sync/src/index.ts](../apps/sync/src/index.ts#L78)

`catch` が広すぎるため、初回での `sync_logs` 未作成だけでなく、認証切れ、D1 障害、ネットワーク障害でも「全件同期を実行します」に落ちます。
これは本来止めるべき障害を隠し、意図しない全件再同期を起こします。

許容するのは「テーブル未作成」のケースに限定し、それ以外は失敗として終了させる方が安全です。

## Verification

- `pnpm test` は通過
- エディタ上の TypeScript エラーは未検出

## Residual risk

今回の境界更新バグはユニットテストでカバーされていません。
最低でも以下のケースはテストまたは手順化が必要です。

- archived のみ変更された同期
- `word` が空のページのみ変更された同期
