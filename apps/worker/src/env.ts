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

const here = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(here, "../../..");

loadEnvFile(join(monorepoRoot, ".env.local"));
loadEnvFile(join(monorepoRoot, ".env"));

const REQUIRED_ENV = ["DATABASE_URL", "ENCRYPTION_KEY"] as const;
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `[worker:env] Missing required env vars: ${missing.join(", ")}. ` +
      `Checked ${join(monorepoRoot, ".env.local")} and ${join(monorepoRoot, ".env")}.`,
  );
  process.exit(1);
}

console.info(`[worker:env] Loaded env from ${monorepoRoot} — DATABASE_URL ✓, ENCRYPTION_KEY ✓`);
