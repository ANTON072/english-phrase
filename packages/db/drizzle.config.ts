import { config } from "dotenv";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

config({ path: path.join(__dirname, "../../.env") });

export default defineConfig({
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CF_ACCOUNT_ID!,
    databaseId: process.env.CF_D1_DATABASE_ID!,
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
  schema: "./src/schema.ts",
  out: "./migrations",
});
