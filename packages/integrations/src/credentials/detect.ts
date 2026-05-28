import type { WorkflowDefinition } from "@workflow/workflow";

import { CREDENTIAL_PROVIDERS, PROVIDER_METADATA, type CredentialProvider } from "./schemas";

/**
 * Inspect a workflow definition and return the set of credential providers it
 * requires. A node type like "notion.create_page" maps to the "notion"
 * provider via the prefix before the first ".".
 *
 * The matching list is the set of known providers we currently model
 * (see PROVIDER_METADATA). Unknown prefixes are ignored.
 */
export function detectRequiredCredentials(workflow: WorkflowDefinition): CredentialProvider[] {
  const required = new Set<CredentialProvider>();
  const known = new Set<CredentialProvider>(CREDENTIAL_PROVIDERS);

  for (const node of workflow.nodes) {
    const prefix = node.type.split(".")[0];
    if (prefix && known.has(prefix as CredentialProvider)) {
      required.add(prefix as CredentialProvider);
    }
  }
  return Array.from(required);
}

export interface CredentialRequirement {
  provider: CredentialProvider;
  displayName: string;
}

export function describeRequiredCredentials(workflow: WorkflowDefinition): CredentialRequirement[] {
  return detectRequiredCredentials(workflow).map((provider) => ({
    provider,
    displayName: PROVIDER_METADATA[provider].displayName,
  }));
}
