import type { CompleteChatParams, CompleteChatResult } from "./types.js";

type ChatResponse = {
  choices?: { message?: { content?: string | unknown } }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string };
};

function extractContent(message: { content?: string | unknown }): string {
  const content = message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) =>
        typeof c === "string"
          ? c
          : c && typeof c === "object" && "text" in c
            ? String((c as { text?: string }).text ?? "")
            : "",
      )
      .join("");
  }
  return content != null ? String(content) : "";
}

export async function completeChat(params: CompleteChatParams): Promise<CompleteChatResult> {
  const { config, system, user, jsonMode } = params;
  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
  };
  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(config.chatUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OVH LLM HTTP ${res.status}: ${errText.slice(0, 400)}`);
  }

  const data = (await res.json()) as ChatResponse;
  if (data.error?.message) {
    throw new Error(`OVH LLM: ${data.error.message}`);
  }

  const text = extractContent(data.choices?.[0]?.message ?? {});
  if (!text.trim()) {
    throw new Error("OVH LLM returned empty content");
  }

  return {
    text,
    usage: {
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens,
    },
  };
}
