import type { CockpitSiteBrief } from "@matia/core";

export function SiteBrief({ brief }: { brief: CockpitSiteBrief }) {
  const scoreBadge =
    brief.overallScore === "good"
      ? "badge-ok"
      : brief.overallScore === "critical"
        ? "badge-bad"
        : "badge-warn";

  const scoreLabel =
    brief.overallScore === "good"
      ? "Looking good"
      : brief.overallScore === "critical"
        ? "Needs attention"
        : brief.overallScore === "attention"
          ? "Room to improve"
          : "Run checks";

  return (
    <section className="brief">
      <div className="brief-header">
        <span className={`badge ${scoreBadge}`}>{scoreLabel}</span>
        <h2>{brief.headline}</h2>
        <p className="lead">{brief.summary}</p>
      </div>

      <div className="brief-grid">
        <article className="card">
          <h3>{brief.deploy.title}</h3>
          <p>{brief.deploy.explanation}</p>
          <p className="next-step">
            <strong>Next:</strong> {brief.deploy.nextStep}
          </p>
        </article>

        <article className="card">
          <h3>{brief.content.title}</h3>
          {brief.content.intentPercent !== null && (
            <p className="metric">
              <span className="metric-value">{brief.content.intentPercent}%</span>
              <span className="metric-label">of planned search topics covered</span>
            </p>
          )}
          <p>{brief.content.explanation}</p>
          {brief.content.partialTopics.length > 0 && (
            <ul className="topic-list">
              {brief.content.partialTopics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <article className="card" style={{ marginTop: "1rem" }}>
        <h3>{brief.visibility.title}</h3>
        <ul className="check-list">
          {brief.visibility.checks.map((check) => (
            <li key={check.id} className={`check check-${check.status}`}>
              <span className="check-icon" aria-hidden>
                {check.status === "pass" ? "✓" : check.status === "fail" ? "✗" : "!"}
              </span>
              <div>
                <strong>{check.title}</strong>
                <p className="meta">{check.explanation}</p>
              </div>
            </li>
          ))}
        </ul>
      </article>
      <article className="card" style={{ marginTop: "1rem" }}>
        <h3>{brief.signals.title}</h3>
        <p className="meta">
          Hypothesis: {brief.signals.hypothesis} · Validated: {brief.signals.validated}
        </p>
        {brief.signals.comparisonMatrix.length > 0 && (
          <table className="matrix-table" style={{ width: "100%", marginTop: "0.75rem" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Check</th>
                <th>You</th>
                <th>Benchmark</th>
              </tr>
            </thead>
            <tbody>
              {brief.signals.comparisonMatrix.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.ownSite === null ? "—" : row.ownSite ? "✓" : "✗"}</td>
                  <td>{row.benchmark === null ? "—" : row.benchmark ? "✓" : "✗"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {brief.signals.findings.length > 0 && (
          <ul className="check-list" style={{ marginTop: "0.75rem" }}>
            {brief.signals.findings.map((finding) => (
              <li key={finding.text} className={`check check-${finding.status}`}>
                <span className="check-icon" aria-hidden>
                  {finding.status === "pass" ? "✓" : finding.status === "fail" ? "✗" : "!"}
                </span>
                <span>{finding.text}</span>
              </li>
            ))}
          </ul>
        )}
        {brief.signals.findings.length === 0 && brief.signals.comparisonMatrix.length === 0 && (
          <p className="meta">Run signal detection to compare your GEO surfaces against benchmark sites.</p>
        )}
      </article>
    </section>
  );
}
