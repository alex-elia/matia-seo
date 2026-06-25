import type { BriefRecommendation, SeoAction } from "@matia/core";

export function RecommendationCards({
  items,
  slug,
  emptyMessage,
}: {
  items: BriefRecommendation[];
  slug: string;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="meta">{emptyMessage}</p>;
  }

  return (
    <div className="rec-list">
      {items.map((rec) => (
        <article key={rec.id} className="rec-card">
          <div className="rec-head">
            <span className={`badge priority-${rec.priority}`}>{rec.priority}</span>
            <h3>{rec.title}</h3>
          </div>
          <p>
            <strong>Why:</strong> {rec.whyItMatters}
          </p>
          <p className="next-step">
            <strong>What to do:</strong> {rec.whatToDo}
          </p>
          {rec.targetUrl && (
            <p className="meta">
              Page: <a href={rec.targetUrl}>{rec.targetUrl}</a>
            </p>
          )}
          <form action={`/api/sites/${slug}/actions`} method="post" className="rec-actions">
            <input type="hidden" name="actionId" value={rec.id} />
            <input type="hidden" name="status" value="approved" />
            <button type="submit" className="primary">
              Approve this step
            </button>
          </form>
          {rec.technicalNote && (
            <details className="tech-details">
              <summary>Technical detail</summary>
              <p className="meta">{rec.technicalNote}</p>
            </details>
          )}
        </article>
      ))}
    </div>
  );
}

export function ApprovedActions({
  actions,
  slug,
}: {
  actions: SeoAction[];
  slug: string;
}) {
  if (actions.length === 0) return null;

  return (
    <section className="card" style={{ marginTop: "1rem" }}>
      <h2>Approved — ready to implement ({actions.length})</h2>
      <p className="meta">
        Approval saves your decision locally. Edit the site repo (or ask Cursor), deploy, then mark
        done.
      </p>
      <ul className="approved-list">
        {actions.map((action) => (
          <li key={action.id} className="approved-item">
            <div>
              <strong>{action.type.replace(/-/g, " ")}</strong>
              <p>{action.rationale}</p>
            </div>
            <form action={`/api/sites/${slug}/actions`} method="post">
              <input type="hidden" name="actionId" value={action.id} />
              <input type="hidden" name="status" value="done" />
              <button type="submit">Mark done</button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
