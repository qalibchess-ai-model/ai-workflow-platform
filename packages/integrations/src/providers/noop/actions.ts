import { NoopActionInput, NoopActionOutput } from "./schemas";

export async function noopAction(
  rawInput: unknown,
): Promise<NoopActionOutput> {
  const input = NoopActionInput.parse(rawInput);

  if (input.delay && input.delay > 0) {
    await new Promise((r) => setTimeout(r, input.delay));
  }

  return NoopActionOutput.parse({
    echoed: input.message,
    timestamp: new Date().toISOString(),
  });
}
