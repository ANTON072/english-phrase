import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";
import type { NewPhrase } from "@english-phrase/db";
import { esc } from "./escape.js";

// ---------------------------------------------------------------------------
// 環境変数バリデーション
// ---------------------------------------------------------------------------
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const D1_DB_NAME = process.env.D1_DB_NAME;

if (!NOTION_API_KEY) throw new Error("NOTION_API_KEY が未設定です");
if (!NOTION_DATABASE_ID) throw new Error("NOTION_DATABASE_ID が未設定です");
if (!D1_DB_NAME) throw new Error("D1_DB_NAME が未設定です");

// wrangler バイナリのパス（ルートの node_modules に配置）
const WRANGLER = path.resolve(__dirname, "../../../node_modules/.bin/wrangler");

// ---------------------------------------------------------------------------
// Notionプロパティ抽出ヘルパー
// ---------------------------------------------------------------------------
function extractText(page: PageObjectResponse, propName: string): string | null {
  const prop = page.properties[propName];
  if (!prop) return null;
  if (prop.type === "title") {
    return prop.title.map((t) => t.plain_text).join("") || null;
  }
  if (prop.type === "rich_text") {
    return prop.rich_text.map((t) => t.plain_text).join("") || null;
  }
  return null;
}

function extractMultiSelect(page: PageObjectResponse, propName: string): string | null {
  const prop = page.properties[propName];
  if (!prop || prop.type !== "multi_select") return null;
  if (prop.multi_select.length === 0) return null;
  return JSON.stringify(prop.multi_select.map((s) => s.name));
}

function extractCreatedTime(page: PageObjectResponse, propName: string): string | null {
  const prop = page.properties[propName];
  if (!prop || prop.type !== "created_time") return null;
  return prop.created_time || null;
}

// ---------------------------------------------------------------------------
// wrangler で D1 にSQLを実行するヘルパー
// ---------------------------------------------------------------------------
function wranglerQuery(sql: string): string {
  return execFileSync(
    WRANGLER,
    ["d1", "execute", D1_DB_NAME!, "--remote", "--json", "--command", sql],
    { encoding: "utf-8" }
  );
}

// ---------------------------------------------------------------------------
// メイン処理
// ---------------------------------------------------------------------------
async function main() {
  // 1. sync_logs から前回の境界時刻を取得
  let lastBoundary: string | null = null;
  try {
    const result = JSON.parse(
      wranglerQuery("SELECT synced_at FROM sync_logs ORDER BY id DESC LIMIT 1;")
    );
    // wrangler --json のレスポンス: [{ results: [...], ... }]
    const rows = result?.[0]?.results ?? [];
    if (rows.length > 0) {
      lastBoundary = rows[0].synced_at as string;
    }
  } catch (err) {
    // sync_logs テーブルが存在しない場合は初回同期として続行。それ以外のエラーはログ出力。
    console.warn("[WARN] sync_logs の取得に失敗しました。全件同期を実行します。", err);
  }

  console.log(lastBoundary ? `前回境界: ${lastBoundary}` : "初回同期: 全件取得");

  // 2. Notion から差分ページ取得
  const notion = new Client({ auth: NOTION_API_KEY });
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;
  let maxLastEditedTime = lastBoundary ?? "";

  const filter =
    lastBoundary !== null
      ? {
          timestamp: "last_edited_time" as const,
          last_edited_time: { after: lastBoundary },
        }
      : undefined;

  console.log("Notion からデータを取得中...");

  do {
    const response = await notion.databases.query({
      database_id: NOTION_DATABASE_ID,
      filter,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const page of response.results) {
      if (page.object !== "page") continue;
      const p = page as PageObjectResponse;
      if (p.archived) continue;

      // last_edited_time の最大値を追跡
      if (p.last_edited_time > maxLastEditedTime) {
        maxLastEditedTime = p.last_edited_time;
      }

      pages.push(p);
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  console.log(`取得件数: ${pages.length} 件`);

  if (pages.length === 0) {
    console.log("同期するデータがありません。");
    return;
  }

  // 3. NewPhrase オブジェクトに変換
  const phrases: NewPhrase[] = [];
  for (const page of pages) {
    const word = extractText(page, "単語");
    if (!word) {
      console.warn(`[WARN] word が空のページをスキップ: ${page.id}`);
      continue;
    }
    phrases.push({
      notionPageId: page.id,
      word,
      meaning: extractText(page, "意味"),
      partOfSpeech: extractMultiSelect(page, "品詞"),
      example: extractText(page, "例文"),
      exampleTranslation: extractText(page, "例文訳"),
      notionCreatedAt: extractCreatedTime(page, "作成日時"),
    });
  }

  if (phrases.length === 0) {
    console.log("有効なデータがありません。");
    return;
  }

  // 4. SQLファイル生成（各 phrase ごとに 1 件の UPSERT 文を生成）
  const outputPath = path.resolve(__dirname, "../output.sql");
  const lines: string[] = [];

  for (const p of phrases) {
    lines.push(
      `INSERT INTO phrases (notion_page_id, word, meaning, part_of_speech, example, example_translation, notion_created_at)` +
        ` VALUES (${esc(p.notionPageId)}, ${esc(p.word)}, ${esc(p.meaning)}, ${esc(p.partOfSpeech)}, ${esc(p.example)}, ${esc(p.exampleTranslation)}, ${esc(p.notionCreatedAt)})` +
        ` ON CONFLICT(notion_page_id) DO UPDATE SET` +
        ` word=excluded.word, meaning=excluded.meaning, part_of_speech=excluded.part_of_speech,` +
        ` example=excluded.example, example_translation=excluded.example_translation, synced_at=datetime('now');`
    );
  }

  try {
    fs.writeFileSync(outputPath, lines.join("\n") + "\n", "utf-8");
    console.log(`SQLファイル生成: ${phrases.length} 件`);

    // 5. D1 に適用
    console.log("D1 にデータを書き込み中...");
    execFileSync(
      WRANGLER,
      ["d1", "execute", D1_DB_NAME!, "--remote", `--file=${outputPath}`],
      { stdio: "inherit" }
    );

    // 6. 成功後のみ sync_logs に境界時刻を記録
    wranglerQuery(
      `INSERT INTO sync_logs (synced_at) VALUES (${esc(maxLastEditedTime)});`
    );
    console.log(`sync_logs に境界時刻を記録: ${maxLastEditedTime}`);

    console.log("同期完了!");
  } finally {
    // 7. 一時ファイル削除（失敗時も含めて必ず実行）
    fs.rmSync(outputPath, { force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
