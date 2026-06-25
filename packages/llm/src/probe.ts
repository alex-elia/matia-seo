import { completeChat } from "./complete-chat.js";
import { resolveLlmConfig } from "./resolve-config.js";
import { getDefaultVaultPath, vaultExists } from "./vault.js";

export type ProbeResult =
  | { ok: true; model: string; vaultPath: string }
  | { ok: false; error: string; vaultPath: string };

export async function probeLlmConnection(vaultPath?: string): Promise<ProbeResult> {
  const path = vaultPath ?? getDefaultVaultPath();
  try {
    const config = resolveLlmConfig({ vaultPath: path });
    await completeChat({
      config,
      system: "Reply with exactly: ok",
      user: "ping",
    });
    return { ok: true, model: config.model, vaultPath: path };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message, vaultPath: path };
  }
}

export function describeVaultStatus(): string {
  const path = getDefaultVaultPath();
  return vaultExists(path)
    ? `Vault found: ${path}`
    : `Vault missing: ${path} (copy config/examples/ovh.env.example)`;
}
