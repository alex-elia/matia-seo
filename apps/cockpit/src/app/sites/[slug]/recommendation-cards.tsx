"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BriefRecommendation, SeoAction } from "@matia/core";
import { postCockpitAction, withScrollPreserved } from "@/lib/action-client";

function approveButtonLabel(actionType?: string): string {
  switch (actionType) {
    case "submit-indexing":
      return "Acknowledge (indexing checklist)";
    case "update-geo-surface":
      return "Create GEO task file";
    case "create-page":
      return "Approve & scaffold page";
    default:
      return "Approve & generate draft";
  }
}
export function RecommendationCards({
  items: initialItems,
  slug,
  emptyMessage,
}: {
  items: BriefRecommendation[];
  slug: string;
  emptyMessage: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function approve(actionId: string) {
    setBusyId(actionId);
    setFeedback(null);
    try {
      const result = await postCockpitAction(slug, actionId, "approved");
      if (!result.ok) {
        setFeedback(result.label);
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== actionId));
      setFeedback(result.label);
      await withScrollPreserved(async () => {
        router.refresh();
      });
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <>
        {feedback && <p className="badge badge-ok">{feedback}</p>}
        <p className="meta">{emptyMessage}</p>
      </>
    );
  }

  return (
    <>
      {feedback && <p className="badge badge-ok">{feedback}</p>}
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
            <div className="rec-actions">
              <button
                type="button"
                className="primary"
                disabled={busyId === rec.id}
                onClick={() => approve(rec.id)}
              >
                {busyId === rec.id ? "Working…" : approveButtonLabel(rec.actionType)}
              </button>
            </div>
            {rec.technicalNote && (
              <details className="tech-details">
                <summary>Technical detail</summary>
                <p className="meta">{rec.technicalNote}</p>
              </details>
            )}
          </article>
        ))}
      </div>
    </>
  );
}

export function ApprovedActions({
  actions: initialActions,
  slug,
}: {
  actions: SeoAction[];
  slug: string;
}) {
  const router = useRouter();
  const [actions, setActions] = useState(initialActions);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function markDone(actionId: string) {
    setBusyId(actionId);
    setFeedback(null);
    try {
      const result = await postCockpitAction(slug, actionId, "done");
      if (!result.ok) {
        setFeedback(result.label);
        return;
      }
      setActions((prev) => prev.filter((action) => action.id !== actionId));
      setFeedback(result.label);
      await withScrollPreserved(async () => {
        router.refresh();
      });
    } finally {
      setBusyId(null);
    }
  }

  if (actions.length === 0) {
    return feedback ? <p className="badge badge-ok">{feedback}</p> : null;
  }

  return (
    <section className="card" style={{ marginTop: "1rem" }}>
      <h2>Approved — ready to implement ({actions.length})</h2>
      {feedback && <p className="badge badge-ok">{feedback}</p>}
      <p className="meta">
        Approve runs the host executor — curated patches apply instantly; content actions call OVH{" "}
        <code>gpt-oss-120b</code> via <code>matia content generate</code>. Review drafts, then mark
        done.
      </p>
      <ul className="approved-list">
        {actions.map((action) => (
          <li key={action.id} className="approved-item">
            <div>
              <strong>{action.type.replace(/-/g, " ")}</strong>
              <p>{action.rationale}</p>
              {action.outcome && <p className="meta">Last run: {action.outcome}</p>}
            </div>
            <button
              type="button"
              disabled={busyId === action.id}
              onClick={() => markDone(action.id)}
            >
              {busyId === action.id ? "Saving…" : "Mark done"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
