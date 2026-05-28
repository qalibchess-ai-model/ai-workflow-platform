ALTER TABLE "tenants" ADD COLUMN "clerk_org_id" text;--> statement-breakpoint
CREATE INDEX "runs_tenant_id_idx" ON "runs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "runs_workflow_id_idx" ON "runs" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "runs_created_at_idx" ON "runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "step_logs_run_id_idx" ON "step_logs" USING btree ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_clerk_org_id_idx" ON "tenants" USING btree ("clerk_org_id");--> statement-breakpoint
CREATE INDEX "workflows_tenant_id_idx" ON "workflows" USING btree ("tenant_id");