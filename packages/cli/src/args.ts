export function getArg(flag: string, defaultValue?: string): string | undefined {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  if (index === -1) return defaultValue;
  return args[index + 1] ?? defaultValue;
}

export function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag);
}

export function getCommand(): string {
  return process.argv[2] ?? "help";
}

export function getSubcommand(): string | undefined {
  return process.argv[3];
}
