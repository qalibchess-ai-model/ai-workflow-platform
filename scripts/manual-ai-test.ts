/**
 * Manual integration test: AI generation katı (packages/ai) üçün.
 * Real Claude API çağırılır — ANTHROPIC_API_KEY .env.local-da olmalıdır.
 *
 * Run: pnpm tsx scripts/manual-ai-test.ts
 * Custom prompt: pnpm tsx scripts/manual-ai-test.ts "öz prompt-un"
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.length >= 2) {
      const first = value[0];
      const last = value[value.length - 1];
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        value = value.slice(1, -1);
      }
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const DEFAULT_PROMPT =
  "Hər gün səhər saat 9-da https://api.example.com/data ünvanından məlumat çək, sonra onu transform et və nəticəni yoxla.";

async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, "..");
  loadEnvFile(join(root, ".env.local"));
  loadEnvFile(join(root, ".env"));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY tapılmadı. .env.local-da təyin et.");
    process.exit(1);
  }

  const { generateWorkflow, validateGeneratedWorkflow, getAvailableNodeTypes } =
    await import("../packages/ai/src/index");

  const prompt = process.argv.slice(2).join(" ").trim() || DEFAULT_PROMPT;

  console.info("┌─ Manual AI Test — generateWorkflow");
  console.info("│");
  console.info("│ Prompt:");
  console.info("│   ", prompt);
  console.info("│");
  console.info("│ Mövcud node tipləri:", getAvailableNodeTypes().join(", "));
  console.info("│");
  console.info("└─ Claude-a göndərilir...\n");

  const startedAt = Date.now();
  const workflow = await generateWorkflow({ userPrompt: prompt });
  const generatedMs = Date.now() - startedAt;

  console.info(`✅ ${generatedMs}ms-də generasiya tamamlandı.\n`);
  console.info("─── Workflow JSON ───");
  console.info(JSON.stringify(workflow, null, 2));
  console.info("─────────────────────\n");

  console.info("Validation yoxlanır...");
  const validation = validateGeneratedWorkflow(workflow);

  if (validation.ok) {
    console.info("✅ Validation uğurlu.");
    console.info(
      `   Node sayı: ${validation.workflow.nodes.length}, edge sayı: ${validation.workflow.edges.length}, trigger: ${validation.workflow.trigger.type}`,
    );
    process.exitCode = 0;
    return;
  }
  console.error(`❌ Validation uğursuz [${validation.code}]: ${validation.message}`);
  process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error("❌ Uğursuz:");
  console.error(err);
  process.exitCode = 1;
});
