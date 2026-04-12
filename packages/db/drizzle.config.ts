import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: path.join(__dirname, "../../.env") });

const missing = ["CLOUDFLARE_ACCOUNT_ID", "CF_D1_DATABASE_ID", "CLOUDFLARE_API_TOKEN"].filter(
  (key) => !process.env[key]?.trim()
);
if (missing.length > 0) {
  throw new Error(`drizzle config: 環境変数が未設定です: ${missing.join(", ")}`);
}

export default defineConfig({
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CF_D1_DATABASE_ID!,
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
  schema: "./src/schema.ts",
  out: "./migrations",
});
