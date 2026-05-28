/**
 * Universal node test runner — workflow node-larını AI olmadan, birbaşa test edir.
 *
 * Run:
 *   pnpm tsx scripts/test-node.ts <node.type> '<json-params>' [--tenant=<id>]
 *
 * Examples:
 *   pnpm tsx scripts/test-node.ts telegram.sendMessage '{"chatId":"123","text":"salam"}'
 *   pnpm tsx scripts/test-node.ts notion.queryDatabase '{"databaseId":"abc...","pageSize":3}'
 *   pnpm tsx scripts/test-node.ts slack.sendMessage '{"channel":"#general","text":"hi"}'
 *
 * Tələblər:
 *   - DATABASE_URL, ENCRYPTION_KEY .env.local-da
 *   - Tenant + uyğun credential DB-də mövcud olmalıdır
 *   - TEST_TENANT_ID env, və ya --tenant=<id> bayrağı
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

interface ParsedArgs {
  nodeType: string;
  paramsJson: string;
  tenantId?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  let tenantId: string | undefined;

  for (const a of argv) {
    if (a.startsWith("--tenant=")) {
      tenantId = a.slice("--tenant=".length);
    } else if (a === "--tenant") {
      // handled by following arg
      continue;
    } else {
      positional.push(a);
    }
  }

  if (positional.length < 2) {
    console.error(
      "Usage: pnpm tsx scripts/test-node.ts <node.type> '<json-params>' [--tenant=<id>]",
    );
    console.error('Example: pnpm tsx scripts/test-node.ts noop \'{"message":"hi"}\'');
    process.exit(2);
  }

  return {
    nodeType: positional[0],
    paramsJson: positional[1],
    tenantId,
  };
}

function pad(label: string): string {
  return label.padEnd(14, " ");
}

async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, "..");
  loadEnvFile(join(root, ".env.local"));
  loadEnvFile(join(root, ".env"));

  const args = parseArgs(process.argv.slice(2));
  const tenantId = args.tenantId ?? process.env.TEST_TENANT_ID;

  if (!tenantId) {
    console.error("❌ tenantId tapılmadı. --tenant=<id> ver, ya da TEST_TENANT_ID env təyin et.");
    process.exit(2);
  }
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL təyin olunmayıb (.env.local).");
    process.exit(2);
  }
  if (!process.env.ENCRYPTION_KEY) {
    console.error("❌ ENCRYPTION_KEY təyin olunmayıb (credential deşifrəsi üçün lazımdır).");
    process.exit(2);
  }

  let rawParams: unknown;
  try {
    rawParams = JSON.parse(args.paramsJson);
  } catch (err) {
    console.error("❌ JSON params parse edilmədi:", (err as Error).message);
    process.exit(2);
  }

  const [
    { getHandler, hasHandler, listHandlers },
    { registerAllNodes, resolveCredential, CredentialNotFoundError, IntegrationError },
    { getDb, closeDb },
  ] = await Promise.all([
    import("../packages/workflow/src/index"),
    import("../packages/integrations/src/index"),
    import("../packages/db/src/index"),
  ]);

  registerAllNodes();

  if (!hasHandler(args.nodeType)) {
    console.error(`❌ Naməlum node tipi: ${args.nodeType}`);
    console.error("Mövcud tiplər:");
    for (const h of listHandlers()) {
      console.error(`   - ${h.type}`);
    }
    process.exit(2);
  }

  const handler = getHandler(args.nodeType);
  const provider = args.nodeType.split(".")[0];
  const needsCredential = provider !== args.nodeType; // bir nöqtə varsa, provider node-dur

  console.info("┌─ test-node");
  console.info(`│ ${pad("Node:")} ${args.nodeType}`);
  console.info(`│ ${pad("Tenant:")} ${tenantId}`);
  console.info(`│ ${pad("Provider:")} ${needsCredential ? provider : "(yoxdur — builtin)"}`);
  console.info(`│ ${pad("Params:")} ${JSON.stringify(rawParams)}`);
  console.info("└─\n");

  let input: unknown;
  try {
    input = handler.inputSchema.parse(rawParams);
  } catch (err) {
    console.error("❌ Input schema validation uğursuz:");
    console.error(err);
    process.exit(1);
  }

  const ctx = {
    runId: `test-${Date.now()}`,
    workflowId: "test-workflow",
    tenantId,
    nodeId: "test-node",
    state: {},
    logger: {
      info: (...a: unknown[]) => console.info("  [node]", ...a),
      warn: (...a: unknown[]) => console.warn("  [node]", ...a),
      error: (...a: unknown[]) => console.error("  [node]", ...a),
    },
    loadCredential: async <T = Record<string, unknown>>(
      providerKey: string,
      label?: string,
    ): Promise<T> => resolveCredential<T>({ db: getDb(), tenantId, provider: providerKey, label }),
  };

  const startedAt = Date.now();
  try {
    const rawOutput = await handler.execute(input, ctx);
    const output = handler.outputSchema.parse(rawOutput);
    const elapsed = Date.now() - startedAt;

    console.info(`✅ ${elapsed}ms-də bitdi.\n`);
    console.info("─── Output ───");
    console.info(JSON.stringify(output, null, 2));
    console.info("──────────────");
    process.exitCode = 0;
  } catch (err) {
    const elapsed = Date.now() - startedAt;
    console.error(`❌ ${elapsed}ms-də xəta:\n`);
    if (err instanceof CredentialNotFoundError) {
      console.error(`Credential tapılmadı: provider="${err.provider}", tenantId="${tenantId}"`);
      console.error("→ Settings → Credentials bölməsindən bu provider üçün giriş əlavə et.");
    } else if (err instanceof IntegrationError) {
      console.error(`[${err.name}] ${err.message}`);
    } else if (err instanceof Error) {
      console.error(`[${err.name}] ${err.message}`);
      if (err.stack) console.error(err.stack);
    } else {
      console.error(err);
    }
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}

main().catch((err: unknown) => {
  console.error("❌ Gözlənilməz xəta:");
  console.error(err);
  process.exitCode = 1;
});
