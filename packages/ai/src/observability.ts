import { Langfuse } from "langfuse";

export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST,
});

export function observe(name: string) {
  return <TArgs extends unknown[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
  ) => {
    return async (...args: TArgs): Promise<TReturn> => {
      const trace = langfuse.trace({ name });
      try {
        const result = await fn(...args);
        trace.update({ output: result as object });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        trace.update({
          output: { error: message },
          metadata: { level: "ERROR" },
        });
        throw error;
      } finally {
        await langfuse.flushAsync();
      }
    };
  };
}
