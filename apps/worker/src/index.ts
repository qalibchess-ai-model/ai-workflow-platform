import "./env";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { serve as inngestServe } from "inngest/hono";

import { executeWorkflow } from "./functions/execute";
import { inngest } from "./lib/inngest";

const app = new Hono();

app.get("/", (c) => c.json({ status: "ok", service: "worker" }));
app.get("/health", (c) => c.json({ status: "healthy" }));

app.on(
  ["GET", "POST", "PUT"],
  "/api/inngest",
  inngestServe({ client: inngest, functions: [executeWorkflow] }),
);

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.info(`Worker listening on http://localhost:${info.port}`);
});
