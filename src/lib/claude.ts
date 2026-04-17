import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export function hasClaudeKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

interface AskClaudeOptions {
  model?: string;
  maxTokens?: number;
}

export async function askClaude(
  system: string,
  user: string,
  options: AskClaudeOptions = {},
): Promise<string> {
  const client = getClient();
  if (!client) throw new Error("ANTHROPIC_API_KEY not set");

  const model = options.model ?? "claude-opus-4-6";
  const maxTokens = options.maxTokens ?? 1024;

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: [
      {
        type: "text",
        text: system,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: user }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return "";
  return textBlock.text;
}

export async function streamClaude(
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  options: AskClaudeOptions = {},
): Promise<ReadableStream<Uint8Array>> {
  const client = getClient();
  if (!client) throw new Error("ANTHROPIC_API_KEY not set");

  const model = options.model ?? "claude-opus-4-6";
  const maxTokens = options.maxTokens ?? 2048;

  const stream = client.messages.stream({
    model,
    max_tokens: maxTokens,
    system: [
      {
        type: "text",
        text: system,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ delta: event.delta.text })}\n\n`,
              ),
            );
          }
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`),
        );
        controller.close();
      }
    },
  });
}
