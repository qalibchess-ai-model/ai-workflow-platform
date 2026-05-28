export {
  CREDENTIAL_PROVIDERS,
  CustomCredentialSchema,
  HubspotCredentialSchema,
  NotionCredentialSchema,
  PROVIDER_CREDENTIAL_SCHEMAS,
  PROVIDER_METADATA,
  SlackCredentialSchema,
  SupabaseCredentialSchema,
  TelegramCredentialSchema,
  getCredentialSchema,
  isKnownProvider,
  parseCredentialValue,
} from "./schemas";

export type {
  CredentialProvider,
  CustomCredential,
  HubspotCredential,
  NotionCredential,
  ProviderFieldSpec,
  ProviderMeta,
  SlackCredential,
  SupabaseCredential,
  TelegramCredential,
} from "./schemas";

export { CredentialNotFoundError, resolveCredential } from "./resolve";
export {
  detectRequiredCredentials,
  describeRequiredCredentials,
  type CredentialRequirement,
} from "./detect";
