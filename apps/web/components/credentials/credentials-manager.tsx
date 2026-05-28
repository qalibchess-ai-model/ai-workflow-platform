"use client";

import * as React from "react";
import { Plus, Trash2, KeyRound } from "lucide-react";
import type { MaskedCredential } from "@workflow/db";
import type { CredentialProvider, ProviderFieldSpec } from "@workflow/integrations";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { createCredentialAction, deleteCredentialAction } from "@/app/actions/credentials";

export interface ProviderOption {
  key: CredentialProvider;
  displayName: string;
  description: string;
  fields: ProviderFieldSpec[];
}

interface Props {
  initialCredentials: MaskedCredential[];
  providers: ProviderOption[];
}

export function CredentialsManager({ initialCredentials, providers }: Props): React.JSX.Element {
  const [items, setItems] = React.useState<MaskedCredential[]>(initialCredentials);
  const [showForm, setShowForm] = React.useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-muted-foreground">
            {items.length === 0
              ? "Hələ heç bir credential əlavə edilməyib."
              : `Cəmi ${items.length} credential.`}
          </p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)} variant={showForm ? "secondary" : "default"}>
          <Plus className="size-4" />
          {showForm ? "Bağla" : "Yeni credential"}
        </Button>
      </div>

      {showForm && (
        <NewCredentialForm
          providers={providers}
          onCreated={(created) => {
            setItems((prev) => [created, ...prev]);
            setShowForm(false);
          }}
        />
      )}

      <div className="grid gap-3">
        {items.map((cred) => (
          <CredentialRow
            key={cred.id}
            credential={cred}
            displayName={
              providers.find((p) => p.key === cred.provider)?.displayName ?? cred.provider
            }
            onDeleted={() => setItems((prev) => prev.filter((c) => c.id !== cred.id))}
          />
        ))}
      </div>
    </div>
  );
}

function CredentialRow({
  credential,
  displayName,
  onDeleted,
}: {
  credential: MaskedCredential;
  displayName: string;
  onDeleted: () => void;
}): React.JSX.Element {
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleDelete(): Promise<void> {
    if (!confirm(`"${credential.label}" credential-ı silinsin?`)) return;
    setDeleting(true);
    setError(null);
    const result = await deleteCredentialAction({ id: credential.id });
    if (!result.ok) {
      setError(result.error);
      setDeleting(false);
      return;
    }
    onDeleted();
  }

  return (
    <Card className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <KeyRound className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-medium text-foreground">{credential.label}</span>
              <span className="rounded-full bg-hover px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                {displayName}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[12px] text-muted-foreground">
              {Object.entries(credential.maskedFields).map(([k, v]) => (
                <span key={k}>
                  <span className="text-text-tertiary">{k}:</span> {v}
                </span>
              ))}
            </div>
            {error && <p className="mt-2 text-[12px] text-destructive">{error}</p>}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sil"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </Card>
  );
}

function NewCredentialForm({
  providers,
  onCreated,
}: {
  providers: ProviderOption[];
  onCreated: (cred: MaskedCredential) => void;
}): React.JSX.Element {
  const [provider, setProvider] = React.useState<CredentialProvider>(providers[0]!.key);
  const [label, setLabel] = React.useState("");
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const meta = providers.find((p) => p.key === provider)!;

  function setField(name: string, value: string): void {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleProviderChange(next: CredentialProvider): void {
    setProvider(next);
    setValues({});
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const cleaned: Record<string, string> = {};
    for (const f of meta.fields) {
      const v = values[f.name]?.trim() ?? "";
      if (f.required && v.length === 0) {
        setError(`${f.label} tələb olunur`);
        setSubmitting(false);
        return;
      }
      if (v.length > 0) cleaned[f.name] = v;
    }

    const result = await createCredentialAction({
      provider,
      label: label.trim(),
      value: cleaned,
    });

    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    const maskedFields: Record<string, string> = {};
    for (const f of meta.fields) {
      const raw = cleaned[f.name];
      if (raw === undefined) continue;
      maskedFields[f.name] = f.secret ? mask(raw) : raw;
    }
    onCreated({
      id: result.id,
      tenantId: "",
      provider,
      label: label.trim(),
      maskedFields,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setSubmitting(false);
    setLabel("");
    setValues({});
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yeni credential</CardTitle>
        <CardDescription>
          Servis seç, sahələri doldur. Key-lər şifrələnərək saxlanılır.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="cred-provider">Servis</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {providers.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handleProviderChange(p.key)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-left text-[13px] transition-colors",
                    provider === p.key
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-transparent text-muted-foreground hover:bg-hover hover:text-foreground",
                  )}
                >
                  <div className="font-medium">{p.displayName}</div>
                </button>
              ))}
            </div>
            <p className="text-[12px] text-muted-foreground">{meta.description}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cred-label">Label</Label>
            <Input
              id="cred-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Production, marketing, test, ..."
              required
              maxLength={80}
            />
          </div>

          <div className="space-y-4">
            {meta.fields.map((f) => (
              <div key={f.name} className="space-y-2">
                <Label htmlFor={`cred-field-${f.name}`}>
                  {f.label}
                  {!f.required && <span className="ml-1 text-text-tertiary">(opsional)</span>}
                </Label>
                <Input
                  id={`cred-field-${f.name}`}
                  type={f.secret ? "password" : "text"}
                  autoComplete="off"
                  spellCheck={false}
                  value={values[f.name] ?? ""}
                  onChange={(e) => setField(f.name, e.target.value)}
                  placeholder={f.placeholder}
                  required={f.required}
                />
              </div>
            ))}
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saxlanır…" : "Saxla"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function mask(secret: string): string {
  if (secret.length <= 4) return "••••";
  return `••••${secret.slice(-4)}`;
}
