export type {
  CompleteChatParams,
  CompleteChatResult,
  MatiaLlmPurpose,
  MatiaLlmResolvedConfig,
} from "./types.js";
export { completeChat } from "./complete-chat.js";
export {
  MATIA_DEFAULT_MODEL,
  OVH_AI_DEFAULT_BASE_URL,
  readOvhProcessEnv,
  resolveChatCompletionsUrl,
  resolveOvhChatCompletionsUrl,
  resolveModel,
} from "./ovh-env.js";
export { resolveLlmConfig } from "./resolve-config.js";
export { getDefaultVaultPath, loadVaultEnv, parseEnvFile, vaultExists } from "./vault.js";
export { probeLlmConnection, describeVaultStatus, type ProbeResult } from "./probe.js";
