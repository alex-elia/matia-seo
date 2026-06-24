import Link from "next/link";
import { getCockpitStatus, loadActionQueue } from "@matia/core";
import {
  computeDrift,
  fetchRemoteManifest,
  hashLocalManifest,
} from "@/lib/matia-runner";
import { homeDisplayPath, listSitesFromDb } from "@/lib/db";

export default async function DashboardPage() {
  const sites = listSitesFromDb();
  const enriched = await Promise.all(
    sites.map(async (site) => {
      const status = getCockpitStatus(site.slug);
      const queue = loadActionQueue(site.slug);
      const local = hashLocalManifest(site);
      const remote = await fetchRemoteManifest(site.siteUrl);
      const drift = computeDrift(local, remote);
      return { site, status, queue, drift, remote, local };
    }),
  );

  return (
    <main>
      <header>
        <h1>Matia Cockpit</h1>
        <p>
          Local operator console · data at <code>{homeDisplayPath()}</code>
        </p>
      </header>

      <div className="grid">
        {enriched.map(({ site, status, queue, drift, remote, local }) => (
          <article key={site.slug} className="card">
            <h2>
              <Link href={`/sites/${site.slug}`}>{site.name}</Link>
            </h2>
            <p className="meta">{site.siteUrl}</p>
            <p className="meta">
              Queue: {status.queue.proposed} proposed · {status.queue.approved}{" "}
              approved · {status.queue.done} done
            </p>
            <p>
              Deploy drift:{" "}
              <span
                className={`badge ${
                  drift === "in-sync"
                    ? "badge-ok"
                    : drift === "unknown"
                      ? "badge-warn"
                      : "badge-warn"
                }`}
              >
                {drift}
              </span>
            </p>
            {remote && local && (
              <p className="meta">
                Remote build {String(remote.buildId ?? "—")} · strategy{" "}
                {String(remote.strategyUpdatedAt ?? "—")}
              </p>
            )}
            <div className="actions">
              <Link className="btn" href={`/sites/${site.slug}`}>
                Open
              </Link>
            </div>
          </article>
        ))}
      </div>

      {sites.length === 0 && (
        <p className="meta">
          No sites registered. Copy{" "}
          <code>apps/cockpit/data/sites.example.json</code> to{" "}
          <code>{homeDisplayPath()}/sites.json</code> and edit paths.
        </p>
      )}
    </main>
  );
}
