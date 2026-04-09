import { Hono } from "hono";
import { phraseRoute } from "./routes/phrase";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();
app.route("/api/v1", phraseRoute);

export default app;
