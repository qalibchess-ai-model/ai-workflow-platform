import { credentialQueries, type MaskedCredential } from "@workflow/db";
import { PROVIDER_METADATA, type CredentialProvider } from "@workflow/integrations";

import { CredentialsManager } from "@/components/credentials/credentials-manager";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CredentialsSettingsPage(): Promise<React.JSX.Element> {
  const { tenantId } = await requireAuth();
  const items: MaskedCredential[] = await credentialQueries.listForTenant(db, tenantId);

  const providers = Object.values(PROVIDER_METADATA).map((p) => ({
    key: p.key as CredentialProvider,
    displayName: p.displayName,
    description: p.description,
    fields: p.fields,
  }));

  return (
    <div className="mx-auto w-full max-w-[1000px] px-6 py-10 animate-fade-in">
      <div className="space-y-1.5">
        <h1 className="text-h1 font-semibold tracking-tight">Credentials</h1>
        <p className="text-[13px] text-muted-foreground">
          Üçüncü tərəf servislərin API key-lərini buradan idarə et. Key-lər şifrəli saxlanılır və
          yalnız workflow icrası zamanı deşifrə olunur.
        </p>
      </div>

      <div className="mt-8">
        <CredentialsManager initialCredentials={items} providers={providers} />
      </div>
    </div>
  );
}
