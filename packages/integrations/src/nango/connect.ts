import { getNangoClient } from "./client";
import type { ConnectSessionInput, ConnectSessionResult } from "./types";

export async function createConnectSession(
  opts: ConnectSessionInput,
): Promise<ConnectSessionResult> {
  const nango = getNangoClient();
  const session = await nango.createConnectSession({
    end_user: { id: opts.userId },
    organization: { id: opts.tenantId },
    allowed_integrations: [opts.provider],
  });

  return { token: session.data.token };
}
