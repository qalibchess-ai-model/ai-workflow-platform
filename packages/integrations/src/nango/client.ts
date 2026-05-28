import { Nango } from "@nangohq/node";

import { IntegrationConfigError } from "../errors";
import type { NangoCallParams } from "./types";

let cachedNango: Nango | undefined;

export function getNangoClient(): Nango {
  if (cachedNango) return cachedNango;

  const secretKey = process.env.NANGO_SECRET_KEY;
  if (!secretKey) {
    throw new IntegrationConfigError(
      "NANGO_SECRET_KEY is required to use the Nango client",
    );
  }

  cachedNango = new Nango({
    secretKey,
    host: process.env.NANGO_HOST ?? "https://api.nango.dev",
  });
  return cachedNango;
}

export async function nangoCall<T = unknown>(p: NangoCallParams): Promise<T> {
  const nango = getNangoClient();
  const response = await nango.proxy({
    method: p.method,
    endpoint: p.endpoint,
    providerConfigKey: p.provider,
    connectionId: p.tenantId,
    data: p.data,
    params: p.params,
    headers: p.headers,
  });
  return response.data as T;
}
