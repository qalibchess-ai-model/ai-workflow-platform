export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type NangoCallParams = {
  tenantId: string;
  provider: string;
  method: HttpMethod;
  endpoint: string;
  data?: unknown;
  params?: Record<string, string>;
  headers?: Record<string, string>;
};

export type ConnectSessionInput = {
  tenantId: string;
  userId: string;
  provider: string;
};

export type ConnectSessionResult = {
  token: string;
};

export type NangoWebhookEvent =
  | {
      type: "auth";
      operation: "creation";
      connectionId: string;
      providerConfigKey: string;
    }
  | {
      type: "auth";
      operation: "refresh";
      connectionId: string;
      providerConfigKey: string;
    }
  | {
      type: "sync";
      operation: "completion";
      connectionId: string;
      providerConfigKey: string;
      model: string;
    }
  | {
      type: "sync";
      operation: "error";
      connectionId: string;
      providerConfigKey: string;
      error: string;
    };
