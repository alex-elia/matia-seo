"use client";

import { useState } from "react";

export function SiteActions({ slug }: { slug: string }) {
  const [running, setRunning] = useState<string | null>(null);
  const [output, setOutput] = useState<string>("");

  async function run(command: "sync-gsc" | "gap" | "probe-geo") {
    setRunning(command);
    setOutput("");
    const res = await fetch(`/api/sites/${slug}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });
    const data = (await res.json()) as { ok: boolean; stdout: string; stderr: string };
    setOutput([data.stdout, data.stderr].filter(Boolean).join("\n"));
    setRunning(null);
    if (data.ok) window.location.reload();
  }

  return (
    <section className="card">
      <h2>Operator commands</h2>
      <div className="actions">
        <button disabled={!!running} onClick={() => run("probe-geo")} className="primary">
          {running === "probe-geo" ? "Probing…" : "Probe GEO"}
        </button>
        <button disabled={!!running} onClick={() => run("gap")}>
          {running === "gap" ? "Running…" : "Run gap"}
        </button>
        <button disabled={!!running} onClick={() => run("sync-gsc")}>
          {running === "sync-gsc" ? "Syncing…" : "Sync GSC"}
        </button>
      </div>
      {output && <pre>{output}</pre>}
    </section>
  );
}
