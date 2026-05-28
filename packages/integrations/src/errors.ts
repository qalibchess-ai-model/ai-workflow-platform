export class IntegrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationError";
  }
}

export class IntegrationConfigError extends IntegrationError {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationConfigError";
  }
}

export class WebhookSignatureError extends IntegrationError {
  constructor(message: string) {
    super(message);
    this.name = "WebhookSignatureError";
  }
}

export class RateLimitError extends IntegrationError {
  public readonly provider: string;
  public readonly retryAfterMs: number;

  constructor(provider: string, retryAfterMs: number) {
    super(
      `Rate limit exceeded for ${provider} (retry after ${retryAfterMs}ms)`,
    );
    this.name = "RateLimitError";
    this.provider = provider;
    this.retryAfterMs = retryAfterMs;
  }
}
