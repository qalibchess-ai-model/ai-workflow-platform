import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { Inngest } from "inngest";
import { serve as inngestServe } from "inngest/hono";

const app = new Hono();

const inngest = new Inngest({ id: "ai-workflow-platform" });

const helloFn = inngest.createFunction(
  { id: "hello-world" },
  { event: "demo/hello" },
  async ({ event }) => {
    return { message: `Hello, ${event.data?.name ?? "world"}` };
  },
);

app.get("/", (c) => c.json({ status: "ok", service: "worker" }));
app.get("/health", (c) => c.json({ status: "healthy" }));

app.on(
  ["GET", "POST", "PUT"],
  "/api/inngest",
  inngestServe({ client: inngest, functions: [helloFn] }),
);

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.info(`Worker listening on http://localhost:${info.port}`);
});
