import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function findRepoRoot(start: string): string {
  let dir = start;
  while (dir !== "/") {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    dir = dirname(dir);
  }
  return start;
}

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

const here = dirname(fileURLToPath(import.meta.url));
const root = findRepoRoot(resolve(here, "..", "..", ".."));
loadEnvFile(join(root, ".env.local"));
loadEnvFile(join(root, ".env"));

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY tapılmadı. .env.local-da təyin et.");
  process.exit(1);
}

const { generateWorkflowWithCorrection, getAvailableNodeTypes } = await import("../src/index");

const prompt =
  process.argv.slice(2).join(" ").trim() ||
  "Hər gün saat 9-da JSONPlaceholder API-dən (https://jsonplaceholder.typicode.com/posts) data çək və hər post-un başlığı və ID-sini saxla.";

console.info("┌─ AI Workflow Generation — Manual Test");
console.info("│");
console.info("│ Prompt:", prompt);
console.info("│ Mövcud node tipləri:", getAvailableNodeTypes().join(", "));
console.info("│");
console.info("└─ Çağırılır...\n");

const startedAt = Date.now();
try {
  const result = await generateWorkflowWithCorrection({ userPrompt: prompt });
  const elapsed = Date.now() - startedAt;
  console.info(`✅ ${elapsed}ms-də ${result.attempts} cəhdlə yarandı:\n`);
  console.info(JSON.stringify(result.workflow, null, 2));
  process.exit(0);
} catch (err) {
  const elapsed = Date.now() - startedAt;
  console.error(`❌ ${elapsed}ms sonra uğursuz:`, err);
  process.exit(1);
}
