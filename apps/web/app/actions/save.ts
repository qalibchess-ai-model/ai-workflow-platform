"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { workflowQueries } from "@workflow/db";
import { registerAllNodes } from "@workflow/integrations";
import { validateWorkflow } from "@workflow/workflow";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

registerAllNodes();

const SaveInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Ad tələb olunur").max(200),
  definition: z.unknown(),
});

export type SaveWorkflowResult = { ok: true; id: string } | { ok: false; error: string };

export async function saveWorkflowAction(
  input: z.infer<typeof SaveInputSchema>,
): Promise<SaveWorkflowResult> {
  const { userId, tenantId } = await requireAuth();

  const parsed = SaveInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Yanlış input" };
  }

  let definition;
  try {
    definition = validateWorkflow(parsed.data.definition);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Workflow keçərsizdir";
    return { ok: false, error: message };
  }

  if (parsed.data.id) {
    const updated = await workflowQueries.update(db, {
      id: parsed.data.id,
      tenantId,
      patch: { name: parsed.data.name, definition },
    });
    if (!updated) {
      return { ok: false, error: "Workflow tapılmadı" };
    }
    revalidatePath("/dashboard");
    revalidatePath(`/workflows/${updated.id}`);
    return { ok: true, id: updated.id };
  }

  const created = await workflowQueries.create(db, {
    tenantId,
    name: parsed.data.name,
    definition,
    createdBy: userId,
  });
  revalidatePath("/dashboard");
  return { ok: true, id: created.id };
}
