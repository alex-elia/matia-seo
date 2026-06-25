import Link from "next/link";
import { notFound } from "next/navigation";
import {
  buildCockpitSiteBrief,
  computeDriftStatus,
  getCockpitStatus,
  loadActionQueue,
  type GapAnalysisResult,
  type GeoProbeResult,
} from "@matia/core";
import { fetchRemoteManifest, hashLocalManifest } from "@/lib/matia-runner";
import { getLatestSnapshot, getSiteBySlug } from "@/lib/db";
import { ApprovedActions, RecommendationCards } from "./recommendation-cards";
import { SiteActions, TechnicalDetails } from "./site-actions";
import { SiteBrief } from "./site-brief";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ msg?: string }>;
};

export default async function SiteDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { msg } = await searchParams;
  const site = getSiteBySlug(slug);
  if (!site) notFound();

  getCockpitStatus(slug);
  const allActions = loadActionQueue(slug);
  const proposed = allActions.filter((a) => a.status === "proposed");
  const inProgress = allActions.filter(
    (a) => a.status === "approved" || a.status === "executing",
  );

  const local = hashLocalManifest(site);
  const remote = await fetchRemoteManifest(site.siteUrl);
  const drift = computeDriftStatus(local, remote);

  const latestProbe = getLatestSnapshot(slug, "probe");
  const latestGap = getLatestSnapshot(slug, "gap");

  const brief = buildCockpitSiteBrief({
    drift,
    probe: latestProbe?.payload as GeoProbeResult | null,
    gap: latestGap?.payload as GapAnalysisResult | null,
    proposedActions: proposed,
  });

  return (
    <main>
      <header>
        <p className="meta">
          <Link href="/">← All sites</Link>
        </p>
        <h1>{site.name}</h1>
        <p className="meta">{site.siteUrl}</p>
      </header>

      {msg && <p className="badge badge-ok">{msg}</p>}

      <SiteBrief brief={brief} />

      <div style={{ marginTop: "1rem" }}>
        <SiteActions slug={slug} />
      </div>

      <section className="card" style={{ marginTop: "1rem" }}>
        <h2>Recommended next steps ({brief.recommendations.length})</h2>
        <p className="meta">
          Plain-language suggestions from your strategy and live checks. Approve any you want to
          implement in the site repository.
        </p>
        <RecommendationCards
          slug={slug}
          items={brief.recommendations}
          emptyMessage="No open recommendations. Run “Check live site” and “Analyse content gaps” to generate some."
        />
      </section>

      <ApprovedActions actions={inProgress} slug={slug} />

      <TechnicalDetails probe={latestProbe?.payload} gap={latestGap?.payload} />
    </main>
  );
}
