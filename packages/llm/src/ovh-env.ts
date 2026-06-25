export const OVH_AI_DEFAULT_BASE_URL =
  "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1";

export const MATIA_DEFAULT_MODEL = "gpt-oss-120b";

export type OvhProcessEnv = {
  token?: string;
  chatUrl?: string;
  reasoningModel?: string;
  matiaModel?: string;
  maxTokens?: number;
  temperature?: number;
};

export function readOvhProcessEnv(env: NodeJS.ProcessEnv = process.env): OvhProcessEnv {
  const pick = (key: string) => {
    const v = env[key]?.trim();
    return v || undefined;
  };
  const maxTokens = pick("MATIA_LLM_MAX_TOKENS");
  const temperature = pick("MATIA_LLM_TEMPERATURE");
  return {
    token: pick("OVH_AI_ENDPOINTS_ACCESS_TOKEN"),
    chatUrl: pick("OVH_AI_CHAT_URL"),
    reasoningModel: pick("OVH_AI_REASONING_MODEL"),
    matiaModel: pick("MATIA_LLM_MODEL"),
    maxTokens: maxTokens ? Number(maxTokens) : undefined,
    temperature: temperature ? Number(temperature) : undefined,
  };
}

export function resolveChatCompletionsUrl(baseOrChatUrl: string): string {
  const root = baseOrChatUrl.replace(/\/$/, "");
  if (/\/chat\/completions$/i.test(root)) return root;
  if (/\/v1$/i.test(root)) return `${root}/chat/completions`;
  if (/openai_compat\/.+\/chat\/completions$/i.test(root)) return root;
  if (/openai_compat|\/api\//i.test(root)) {
    return `${root}/chat/completions`;
  }
  return `${root}/v1/chat/completions`;
}

export function resolveOvhChatCompletionsUrl(env: OvhProcessEnv = readOvhProcessEnv()): string {
  if (env.chatUrl) {
    return resolveChatCompletionsUrl(env.chatUrl);
  }
  return `${OVH_AI_DEFAULT_BASE_URL}/chat/completions`;
}

export function resolveModel(env: OvhProcessEnv = readOvhProcessEnv()): string {
  return env.matiaModel ?? env.reasoningModel ?? MATIA_DEFAULT_MODEL;
}
