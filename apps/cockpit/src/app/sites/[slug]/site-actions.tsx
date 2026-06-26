"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { withScrollPreserved } from "@/lib/action-client";

export function SiteActions({ slug }: { slug: string }) {
  const router = useRouter();
  const [running, setRunning] = useState<string | null>(null);
  const [output, setOutput] = useState<string>("");

  async function run(command: "sync-gsc" | "gap" | "probe-geo" | "signals-detect") {
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
    if (data.ok) {
      await withScrollPreserved(async () => {
        router.refresh();
      });
    }
  }

  return (
    <section className="card">
      <h2>Refresh analysis</h2>
      <p className="meta">
        Run checks against your live site and strategy. Results appear in the summary above.
      </p>
      <div className="actions">
        <button disabled={!!running} onClick={() => run("probe-geo")} className="primary">
          {running === "probe-geo" ? "Checking live site…" : "Check live site (GEO)"}
        </button>
        <button disabled={!!running} onClick={() => run("gap")}>
          {running === "gap" ? "Analysing…" : "Analyse content gaps"}
        </button>
        <button disabled={!!running} onClick={() => run("signals-detect")}>
          {running === "signals-detect" ? "Detecting signals…" : "Run signal detection"}
        </button>
        <button disabled={!!running} onClick={() => run("sync-gsc")}>
          {running === "sync-gsc" ? "Syncing…" : "Sync Google indexing"}
        </button>
      </div>
      {output && <pre>{output}</pre>}
    </section>
  );
}

export function TechnicalDetails({
  probe,
  gap,
  signals,
}: {
  probe: unknown;
  gap: unknown;
  signals?: unknown;
}) {
  const [open, setOpen] = useState(false);
  const hasProbe = probe != null;
  const hasGap = gap != null;
  const hasSignals = signals != null;
  if (!hasProbe && !hasGap && !hasSignals) return null;

  return (
    <section className="card" style={{ marginTop: "1rem" }}>
      <button type="button" className="btn" onClick={() => setOpen(!open)}>
        {open ? "Hide" : "Show"} technical JSON (for operators)
      </button>
      {open && (
        <div className="grid" style={{ marginTop: "1rem" }}>
          {hasProbe && (
            <article>
              <h3>Latest probe</h3>
              <pre>{JSON.stringify(probe, null, 2).slice(0, 4000)}</pre>
            </article>
          )}
          {hasGap && (
            <article>
              <h3>Latest gap</h3>
              <pre>{JSON.stringify(gap, null, 2).slice(0, 4000)}</pre>
            </article>
          )}
          {hasSignals && (
            <article>
              <h3>Latest signal detection</h3>
              <pre>{JSON.stringify(signals, null, 2).slice(0, 4000)}</pre>
            </article>
          )}
        </div>
      )}
    </section>
  );
}
