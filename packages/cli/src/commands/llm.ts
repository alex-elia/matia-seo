import { describeVaultStatus, probeLlmConnection } from "@matia/llm";
import { getSubcommand } from "../args.js";

export async function runLlmCommand(): Promise<void> {
  const sub = getSubcommand();
  switch (sub) {
    case "probe":
      await runLlmProbe();
      return;
    default:
      console.error(`Unknown llm subcommand: ${sub ?? "(none)"}`);
      console.error("Try: matia llm probe");
      process.exit(1);
  }
}

async function runLlmProbe(): Promise<void> {
  console.log(describeVaultStatus());
  const result = await probeLlmConnection();
  if (result.ok) {
    console.log(`OK — model ${result.model} via ${result.vaultPath}`);
    return;
  }
  console.error(`Probe failed: ${result.error}`);
  process.exit(1);
}
