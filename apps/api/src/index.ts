import { Hono } from "hono";
import { phraseRoute } from "./routes/phrase";
import { speechRoute } from "./routes/speech";

type Bindings = {
  DB: D1Database;
  OPENAI_API_KEY: string;
  VOICE_CACHE: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();
app.route("/api/v1", phraseRoute);
app.route("/api/v1", speechRoute);

export default app;
