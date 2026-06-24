import Link from "next/link";
import { notFound } from "next/navigation";
import { getCockpitStatus, loadActionQueue } from "@matia/core";
import {
  computeDrift,
  fetchRemoteManifest,
  hashLocalManifest,
} from "@/lib/matia-runner";
import { getLatestSnapshot, getSiteBySlug } from "@/lib/db";
import { SiteActions } from "./site-actions";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ msg?: string }>;
};

export default async function SiteDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { msg } = await searchParams;
  const site = getSiteBySlug(slug);
  if (!site) notFound();

  const status = getCockpitStatus(slug);
  const queue = loadActionQueue(slug).filter((a) => a.status === "proposed");
  const local = hashLocalManifest(site);
  const remote = await fetchRemoteManifest(site.siteUrl);
  const drift = computeDrift(local, remote);
  const latestProbe = getLatestSnapshot(slug, "probe");
  const latestGap = getLatestSnapshot(slug, "gap");

  return (
    <main>
      <header>
        <p className="meta">
          <Link href="/">← Cockpit</Link>
        </p>
        <h1>{site.name}</h1>
        <p className="meta">{site.siteUrl}</p>
        <p className="meta">Host repo: {site.hostRoot}</p>
      </header>

      {msg && <p className="badge badge-ok">{msg}</p>}

      <section className="card" style={{ marginBottom: "1rem" }}>
        <h2>Deploy drift</h2>
        <p>
          Status: <span className="badge badge-warn">{drift}</span>
        </p>
        {local && (
          <p className="meta">
            Local strategy hash {local.strategyHash} · registry {local.registryHash}
          </p>
        )}
        {remote && (
          <p className="meta">
            Remote strategy hash {String(remote.strategyHash)} · build{" "}
            {String(remote.buildId ?? "—")}
          </p>
        )}
        {!remote && (
          <p className="meta">
            Remote manifest unavailable — deploy <code>/api/seo/manifest</code> first.
          </p>
        )}
      </section>

      <SiteActions slug={slug} />

      <section className="card" style={{ marginTop: "1rem" }}>
        <h2>Proposed actions ({queue.length})</h2>
        {queue.length === 0 && <p className="meta">No proposed actions. Run gap or probe-geo.</p>}
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Rationale</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {queue.slice(0, 20).map((action) => (
              <tr key={action.id}>
                <td>{action.type}</td>
                <td>{action.rationale}</td>
                <td>
                  <form action={`/api/sites/${slug}/actions`} method="post">
                    <input type="hidden" name="actionId" value={action.id} />
                    <input type="hidden" name="status" value="approved" />
                    <button type="submit" className="primary">
                      Approve
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid" style={{ marginTop: "1rem" }}>
        <article className="card">
          <h2>Latest probe</h2>
          {latestProbe ? (
            <pre>{JSON.stringify(latestProbe.payload, null, 2).slice(0, 1200)}…</pre>
          ) : (
            <p className="meta">No probe in SQLite yet.</p>
          )}
        </article>
        <article className="card">
          <h2>Latest gap</h2>
          {latestGap ? (
            <pre>{JSON.stringify(latestGap.payload, null, 2).slice(0, 1200)}…</pre>
          ) : (
            <p className="meta">No gap in SQLite yet.</p>
          )}
        </article>
      </section>

      <p className="meta" style={{ marginTop: "1rem" }}>
        CLI status: {status.queue.total} total actions · latest gap{" "}
        {status.latestGap ?? "none"}
      </p>
    </main>
  );
}
