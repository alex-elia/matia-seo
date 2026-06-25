import Link from "next/link";
import {
  buildCockpitSiteBrief,
  computeDriftStatus,
  getCockpitStatus,
  loadActionQueue,
} from "@matia/core";
import { fetchRemoteManifest, hashLocalManifest } from "@/lib/matia-runner";
import { homeDisplayPath, listSitesFromDb } from "@/lib/db";

export default async function DashboardPage() {
  const sites = listSitesFromDb();
  const enriched = await Promise.all(
    sites.map(async (site) => {
      const status = getCockpitStatus(site.slug);
      const queue = loadActionQueue(site.slug);
      const local = hashLocalManifest(site);
      const remote = await fetchRemoteManifest(site.siteUrl);
      const drift = computeDriftStatus(local, remote);
      const proposed = queue.filter((a) => a.status === "proposed");
      const brief = buildCockpitSiteBrief({ drift, proposedActions: proposed });
      return { site, status, brief, drift };
    }),
  );

  return (
    <main>
      <header>
        <h1>Matia Cockpit</h1>
        <p className="lead">
          Visibility overview for your websites — plain-language summary, no SEO jargon required.
        </p>
        <p className="meta">Data stored locally at <code>{homeDisplayPath()}</code></p>
      </header>

      <div className="grid">
        {enriched.map(({ site, status, brief, drift }) => (
          <article key={site.slug} className="card">
            <h2>
              <Link href={`/sites/${site.slug}`}>{site.name}</Link>
            </h2>
            <p className="meta">{site.siteUrl}</p>
            <p className="card-headline">{brief.headline}</p>
            <p className="meta">
              {status.queue.proposed} to review · {status.queue.approved} approved ·{" "}
              {status.queue.done} done
            </p>
            <p>
              Deploy:{" "}
              <span className={`badge ${drift === "in-sync" ? "badge-ok" : "badge-warn"}`}>
                {brief.deploy.title}
              </span>
            </p>
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
