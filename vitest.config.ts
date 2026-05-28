import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["packages/**/src/**/*.test.ts", "apps/**/src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.next/**",
        "**/*.config.ts",
        "**/types.ts",
        "e2e/**",
      ],
      thresholds: {
        "packages/workflow/**": { lines: 90, functions: 90 },
        "packages/ai/**": { lines: 80, functions: 80 },
        "packages/integrations/**": { lines: 70, functions: 70 },
      },
    },
  },
});
