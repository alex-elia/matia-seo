import fs from "node:fs";
import { google, type searchconsole_v1 } from "googleapis";

export function createSearchConsoleClient(
  keyPath: string,
): searchconsole_v1.Searchconsole {
  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Google service account key not found at ${keyPath}. Update config or place the key file.`,
    );
  }

  const keyFile = JSON.parse(fs.readFileSync(keyPath, "utf-8")) as {
    client_email: string;
    private_key: string;
  };

  const jwtClient = new google.auth.JWT(
    keyFile.client_email,
    undefined,
    keyFile.private_key,
    [
      "https://www.googleapis.com/auth/webmasters.readonly",
      "https://www.googleapis.com/auth/webmasters",
    ],
  );

  return google.searchconsole({ version: "v1", auth: jwtClient });
}
