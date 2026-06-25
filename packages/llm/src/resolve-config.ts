import {
  MATIA_DEFAULT_MODEL,
  readOvhProcessEnv,
  resolveModel,
  resolveOvhChatCompletionsUrl,
} from "./ovh-env.js";
import { loadVaultEnv } from "./vault.js";
import type { MatiaLlmPurpose, MatiaLlmResolvedConfig } from "./types.js";

export function resolveLlmConfig(_opts?: {
  purpose?: MatiaLlmPurpose;
  vaultPath?: string;
}): MatiaLlmResolvedConfig {
  const env = loadVaultEnv(_opts?.vaultPath);
  const apiKey = env.token ?? readOvhProcessEnv(process.env).token;
  if (!apiKey) {
    throw new Error(
      "OVH AI token missing. Create ~/.matia/secrets/ovh.env from config/examples/ovh.env.example",
    );
  }
  return {
    chatUrl: resolveOvhChatCompletionsUrl(env),
    apiKey,
    model: resolveModel(env) || MATIA_DEFAULT_MODEL,
    temperature: env.temperature ?? 0.25,
    maxTokens: env.maxTokens ?? 8192,
  };
}
