import { describe, it, expect } from "vitest";
import { createTestTenant, createTestWorkflow } from "./fixtures";

describe("createTestTenant", () => {
  it("returns tenant with uuid id and named slug", () => {
    const tenant = createTestTenant();
    expect(tenant.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(tenant.name).toMatch(/^test-tenant-\d+$/);
  });
});

describe("createTestWorkflow", () => {
  it("returns sensible default workflow", () => {
    const wf = createTestWorkflow();
    expect(wf.trigger.type).toBe("manual");
    expect(wf.nodes).toHaveLength(1);
    expect(wf.edges).toHaveLength(0);
  });

  it("applies overrides", () => {
    const wf = createTestWorkflow({ name: "Override" });
    expect(wf.name).toBe("Override");
  });
});
