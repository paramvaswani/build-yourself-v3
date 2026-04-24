import { GoogleGenAI } from "@google/genai";

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!_client) {
    _client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _client;
}

export function hasClaudeKey(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

interface AskClaudeOptions {
  model?: string;
  maxTokens?: number;
}

const DEFAULT_MODEL = "gemini-2.5-pro";

export async function askClaude(
  system: string,
  user: string,
  options: AskClaudeOptions = {},
): Promise<string> {
  const client = getClient();
  if (!client) throw new Error("GEMINI_API_KEY not set");

  const model = options.model ?? DEFAULT_MODEL;
  const maxTokens = options.maxTokens ?? 1024;

  const response = await client.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: user }] }],
    config: {
      systemInstruction: system,
      maxOutputTokens: maxTokens,
    },
  });

  return response.text ?? "";
}

export async function streamClaude(
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  options: AskClaudeOptions = {},
): Promise<ReadableStream<Uint8Array>> {
  const client = getClient();
  if (!client) throw new Error("GEMINI_API_KEY not set");

  const model = options.model ?? DEFAULT_MODEL;
  const maxTokens = options.maxTokens ?? 2048;

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const streamPromise = client.models.generateContentStream({
    model,
    contents,
    config: {
      systemInstruction: system,
      maxOutputTokens: maxTokens,
    },
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = await streamPromise;
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ delta: text })}\n\n`),
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
